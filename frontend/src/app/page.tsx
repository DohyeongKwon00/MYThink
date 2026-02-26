"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Session } from "@/types";

const SUBJECTS = [
  { id: "math", label: "Mathematics", description: "Algebra, calculus, geometry and more", icon: "∑" },
  { id: "physics", label: "Physics", description: "Mechanics, electromagnetism, quantum theory", icon: "⚛" },
  { id: "chemistry", label: "Chemistry", description: "Organic, inorganic, physical chemistry", icon: "⚗" },
  { id: "biology", label: "Biology", description: "Cell biology, genetics, ecology", icon: "🧬" },
];

const SUBJECT_ICONS: Record<string, string> = {
  math: "∑",
  physics: "⚛",
  chemistry: "⚗",
  biology: "🧬",
};

export default function Home() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    apiFetch<Session[]>("/api/sessions").then(setSessions).catch(console.error);
  }, []);

  async function startSession(subject: string) {
    const session = await apiFetch<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ subject }),
    });
    router.push(`/chat/${session.id}`);
  }

  async function deleteSession(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    try {
      await apiFetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function formatDate(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center py-16 px-8">
      <h1 className="text-5xl font-bold mb-2 tracking-tight">MYT</h1>
      <p className="text-gray-400 mb-12 text-lg">Your AI-powered personal tutor</p>

      <div className="w-full max-w-2xl space-y-10">
        {/* New session */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">New Session</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                onClick={() => startSession(s.id)}
                className="group flex flex-col gap-2 rounded-2xl border border-gray-800 bg-gray-900 p-6 text-left transition hover:border-indigo-500 hover:bg-gray-800"
              >
                <span className="text-3xl">{s.icon}</span>
                <span className="text-xl font-semibold group-hover:text-indigo-400 transition">{s.label}</span>
                <span className="text-sm text-gray-400">{s.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-4">Recent Sessions</h2>
            <div className="flex flex-col gap-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/chat/${s.id}`)}
                  className="group/row flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-5 py-4 text-left transition hover:border-indigo-500 hover:bg-gray-800 cursor-pointer"
                >
                  <span className="text-2xl">{SUBJECT_ICONS[s.subject] ?? "💬"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-200 truncate">
                      {s.title ?? s.subject}
                    </p>
                    {s.title && (
                      <p className="text-xs text-gray-500 capitalize">{s.subject}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{formatDate(s.created_at)}</span>
                  <button
                    onClick={(e) => deleteSession(e, s.id)}
                    className="opacity-0 group-hover/row:opacity-100 shrink-0 rounded-lg p-1.5 text-gray-500 transition hover:bg-red-500/20 hover:text-red-400"
                    aria-label="Delete session"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
