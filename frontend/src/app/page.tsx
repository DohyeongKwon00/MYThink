"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Session } from "@/types";

const SUBJECTS = [
  { id: "math", label: "Mathematics", description: "Algebra, calculus, geometry and more", icon: "∑" },
  { id: "physics", label: "Physics", description: "Mechanics, electromagnetism, quantum theory", icon: "⚛" },
  { id: "chemistry", label: "Chemistry", description: "Organic, inorganic, physical chemistry", icon: "⚗" },
  { id: "biology", label: "Biology", description: "Cell biology, genetics, ecology", icon: "🧬" },
];

export default function Home() {
  const router = useRouter();

  async function startSession(subject: string) {
    const session = await apiFetch<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ subject }),
    });
    router.push(`/chat/${session.id}`);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-2 tracking-tight">MYT</h1>
      <p className="text-gray-400 mb-12 text-lg">Your AI-powered personal tutor</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
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
    </main>
  );
}
