"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Session } from "@/types";

const SUBJECTS = [
  {
    id: "math",
    label: "Mathematics",
    description: "Algebra, Geometry, Calculus and more with step-by-step logic.",
    icon: "functions",
    colorBg: "bg-blue-500/20",
    colorText: "text-blue-400",
  },
  {
    id: "biology",
    label: "Biology",
    description: "Deep dive into anatomy, genetics, and ecosystems.",
    icon: "biotech",
    colorBg: "bg-emerald-500/20",
    colorText: "text-emerald-400",
  },
  {
    id: "chemistry",
    label: "Chemistry",
    description: "Periodic table, chemical reactions, and molecular structures.",
    icon: "science",
    colorBg: "bg-amber-500/20",
    colorText: "text-amber-400",
  },
  {
    id: "physics",
    label: "Physics",
    description: "Classical mechanics, thermodynamics, and electromagnetism.",
    icon: "bolt",
    colorBg: "bg-purple-500/20",
    colorText: "text-purple-400",
  },
  {
    id: "literature",
    label: "Literature",
    description: "Analyze texts, understand themes, and master essay writing.",
    icon: "menu_book",
    colorBg: "bg-rose-500/20",
    colorText: "text-rose-400",
  },
  {
    id: "cs",
    label: "Computer Science",
    description: "Coding logic, algorithms, and software design principles.",
    icon: "terminal",
    colorBg: "bg-indigo-500/20",
    colorText: "text-indigo-400",
  },
];

const SUBJECT_ICONS: Record<string, string> = {
  math: "functions",
  physics: "bolt",
  chemistry: "science",
  biology: "biotech",
  literature: "menu_book",
  cs: "terminal",
};

export default function Home() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const subjectsRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex h-screen overflow-hidden bg-[#101622] text-white">
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
            <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>school</span>
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">MYThink AI</h1>
            <p className="text-xs text-slate-400">Academic Excellence</p>
          </div>
        </div>

        {/* Start New Chat */}
        <div className="px-4 mb-6">
          <button
            onClick={() => subjectsRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>add</span>
            <span className="text-sm">Start New Chat</span>
          </button>
        </div>

        {/* Recent Sessions */}
        <div className="flex-1 overflow-y-auto px-3 custom-scrollbar">
          <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recent Sessions
          </div>
          <div className="space-y-0.5">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/chat/${s.id}`)}
                className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="material-symbols-outlined text-slate-400" style={{ fontSize: "18px" }}>
                    {SUBJECT_ICONS[s.subject] ? SUBJECT_ICONS[s.subject] : "chat_bubble"}
                  </span>
                  <span className="truncate text-sm font-medium text-slate-300">{s.title ?? s.subject}</span>
                </div>
                <button
                  onClick={(e) => deleteSession(e, s.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-opacity ml-2 flex-shrink-0"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>delete</span>
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-slate-500 px-3 py-2">No sessions yet</p>
            )}
          </div>
        </div>

        {/* Bottom Nav */}
        <div className="border-t border-slate-800 p-4 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>settings</span>
            <span className="text-sm font-medium">Settings</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>help</span>
            <span className="text-sm font-medium">Help Center</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>logout</span>
            <span className="text-sm font-medium">Log Out</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#101622]/80 backdrop-blur-md px-10 py-4 flex items-center justify-between border-b border-slate-800/50">
          <div className="max-w-xl w-full">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: "20px" }}>search</span>
              <input
                className="w-full pl-12 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm text-white placeholder-slate-500"
                placeholder="Search previous chat sessions..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-sm font-bold px-4 py-2 rounded-lg transition-colors border border-blue-600/20">
              Upgrade Pro
            </button>
            <div className="size-10 rounded-full bg-slate-700 border-2 border-blue-600/20 overflow-hidden cursor-pointer flex items-center justify-center">
              <span className="material-symbols-outlined text-slate-300" style={{ fontSize: "22px" }}>person</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-10 py-8">
          {/* Welcome */}
          <div className="mb-12">
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight">Welcome back, Scholar!</h2>
            <p className="text-slate-400 text-lg">What would you like to master today?</p>
          </div>

          {/* Subjects Grid */}
          <div ref={subjectsRef} className="mb-12">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
              <span className="material-symbols-outlined text-blue-500" style={{ fontSize: "22px" }}>grid_view</span>
              Your Subjects
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SUBJECTS.map((s) => (
                <div
                  key={s.id}
                  onClick={() => startSession(s.id)}
                  className="group bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-600/5 hover:border-blue-600/30 transition-all cursor-pointer"
                >
                  <div className={`${s.colorBg} w-14 h-14 rounded-xl flex items-center justify-center ${s.colorText} mb-5 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined" style={{ fontSize: "28px" }}>{s.icon}</span>
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-white">{s.label}</h4>
                  <p className="text-slate-400 text-sm mb-4">{s.description}</p>
                  <div className="flex items-center text-blue-400 font-semibold text-sm gap-1">
                    Open Subject
                    <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_forward</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature Banner */}
          <div className="bg-slate-900 rounded-3xl p-8 border border-slate-800 flex items-center justify-between gap-8">
            <div className="max-w-md">
              <span className="inline-block bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded mb-4">
                New Feature
              </span>
              <h4 className="text-2xl font-bold mb-3 text-white">Multi-Subject Exams are Here!</h4>
              <p className="text-slate-400 mb-6">
                Test your knowledge across multiple subjects in a single timed session. Perfect for final prep.
              </p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition-all">
                Try it Now
              </button>
            </div>
            <div className="hidden lg:flex w-64 h-48 bg-blue-600/10 rounded-2xl items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-600/30" style={{ fontSize: "96px" }}>quiz</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
