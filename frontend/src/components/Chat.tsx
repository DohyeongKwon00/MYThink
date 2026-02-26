"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { apiFetch } from "@/lib/api";
import type { Message, Note, Session } from "@/types";

function normalizeMath(content: string): string {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$${m}$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);
}

interface Props {
  sessionId: string;
}

const SIDEBAR_SUBJECTS = [
  { id: "math", label: "Math Tutor", icon: "calculate" },
  { id: "physics", label: "Physics Tutor", icon: "bolt" },
  { id: "chemistry", label: "Chemistry Tutor", icon: "biotech" },
  { id: "biology", label: "Biology Tutor", icon: "eco" },
];

const SUBJECT_ICONS: Record<string, string> = {
  math: "calculate",
  physics: "bolt",
  chemistry: "biotech",
  biology: "eco",
  literature: "menu_book",
  cs: "terminal",
};

const SUBJECT_LABELS: Record<string, string> = {
  math: "Math Tutor",
  physics: "Physics Tutor",
  chemistry: "Chemistry Tutor",
  biology: "Biology Tutor",
  literature: "Literature Tutor",
  cs: "CS Tutor",
};

export default function Chat({ sessionId }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openArtifact, setOpenArtifact] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    apiFetch<Message[]>(`/api/chat/${sessionId}`).then(setMessages).catch(console.error);
  }, [sessionId]);

  useEffect(() => {
    apiFetch<Session[]>("/api/sessions")
      .then((data) => {
        setSessions(data);
        setCurrentSession(data.find((s) => s.id === sessionId) ?? null);
      })
      .catch(console.error);
  }, [sessionId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || messages.length === 0) return;
    const last = messages[messages.length - 1];
    const targetIdx = last.role === "assistant" ? messages.length - 2 : messages.length - 1;
    const el = msgRefs.current[targetIdx];
    if (!el) return;
    container.scrollTop = el.offsetTop - container.offsetTop;
  }, [messages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenArtifact(null);
        setShowNote(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function send() {
    const content = input.trim();
    if (!content || loading) return;
    setInput("");
    setLoading(true);
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const response = await apiFetch<Message>("/api/chat", {
        method: "POST",
        body: JSON.stringify({ session_id: sessionId, content }),
      });
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function startNewSession(subject: string) {
    try {
      const session = await apiFetch<Session>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ subject }),
      });
      router.push(`/chat/${session.id}`);
    } catch (err) {
      console.error(err);
    }
  }

  async function generateNote() {
    setNoteLoading(true);
    try {
      const result = await apiFetch<Note>(`/api/notes/${sessionId}`, { method: "POST" });
      setNote(result);
      setShowNote(true);
    } catch (err) {
      console.error(err);
    } finally {
      setNoteLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const subject = currentSession?.subject ?? "";
  const subjectLabel = SUBJECT_LABELS[subject] ?? "AI Tutor";
  const subjectIcon = SUBJECT_ICONS[subject] ?? "smart_toy";

  return (
    <>
      <div className="flex h-full w-full bg-[#101622] text-white">
        {/* Sidebar */}
        <aside className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
          {/* Logo */}
          <div className="p-6 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>neurology</span>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">MYThink AI</h1>
              <p className="text-xs text-slate-400">Personal AI Tutor</p>
            </div>
          </div>

          {/* New Session */}
          <div className="px-4 mb-4">
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add</span>
              <span className="text-sm">New Session</span>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 custom-scrollbar">
            <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Subjects
            </div>
            {SIDEBAR_SUBJECTS.map((s) => (
              <button
                key={s.id}
                onClick={() => startNewSession(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left mb-0.5 ${
                  subject === s.id
                    ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                    : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>{s.icon}</span>
                <span className="text-sm font-medium">{s.label}</span>
              </button>
            ))}

            <div className="px-3 pt-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Recent History
            </div>
            {sessions.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() => router.push(`/chat/${s.id}`)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left mb-0.5 ${
                  s.id === sessionId
                    ? "bg-blue-600/10 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>history</span>
                <span className="text-sm truncate">{s.title ?? s.subject}</span>
              </button>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors">
              <div className="size-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: "18px" }}>person</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Student</p>
                <p className="text-xs text-slate-400">Free Plan</p>
              </div>
              <span className="material-symbols-outlined text-slate-400" style={{ fontSize: "18px" }}>settings</span>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-[#101622]">
          {/* Header */}
          <header className="h-16 flex-shrink-0 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/50 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>{subjectIcon}</span>
              </div>
              <div>
                <h2 className="font-bold text-white leading-tight">{subjectLabel}</h2>
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 inline-block"></span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">AI Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: "18px" }}>search</span>
                <input
                  className="bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:outline-none w-52"
                  placeholder="Search chat history..."
                  type="text"
                />
              </div>
              <button
                onClick={generateNote}
                disabled={noteLoading || messages.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-400 transition disabled:opacity-40"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>note_add</span>
                {noteLoading ? "Generating…" : "Generate Notes"}
              </button>
              <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-600/10 rounded-lg transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>share</span>
              </button>
              <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-600/10 rounded-lg transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>more_vert</span>
              </button>
            </div>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-8 space-y-8">
            {messages.length === 0 && !loading && (
              <div className="flex items-start gap-4 max-w-3xl">
                <div className="size-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>smart_toy</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="bg-slate-800 p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-700/50">
                    <p className="leading-relaxed text-slate-100 text-sm">
                      Hello! I&apos;m your {subjectLabel}. Ask me anything and I&apos;ll help you learn step by step.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 ml-1">MYThink AI • Just now</span>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                ref={(el) => { msgRefs.current[idx] = el; }}
                className={`flex items-start gap-4 ${
                  msg.role === "user" ? "flex-row-reverse max-w-3xl ml-auto" : "max-w-3xl"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="size-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>smart_toy</span>
                  </div>
                ) : (
                  <div className="size-10 rounded-full bg-slate-700 flex-shrink-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-300" style={{ fontSize: "20px" }}>person</span>
                  </div>
                )}
                <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : ""}`}>
                  <div
                    className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-none shadow-md"
                        : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700/50"
                    }`}
                  >
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {normalizeMath(msg.content)}
                    </ReactMarkdown>
                    {msg.artifact && (
                      <button
                        onClick={() => setOpenArtifact(msg.artifact!)}
                        className="mt-3 flex items-center gap-2 rounded-xl bg-blue-500/20 border border-blue-500/40 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/30 transition w-full"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>play_circle</span>
                        Open Interactive Simulation
                      </button>
                    )}
                  </div>
                  <span className={`text-[11px] text-slate-500 ${msg.role === "user" ? "mr-1" : "ml-1"}`}>
                    {msg.role === "assistant" ? "MYThink AI" : "You"} • Just now
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-4 max-w-3xl">
                <div className="size-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>smart_toy</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="bg-slate-800 text-slate-400 p-4 rounded-2xl rounded-tl-none border border-slate-700/50 text-sm animate-pulse">
                    Thinking…
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-6 bg-slate-900/50 backdrop-blur-md border-t border-slate-800">
            <div className="max-w-4xl mx-auto relative">
              <div className="absolute inset-y-0 left-4 flex items-center gap-1">
                <button className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors hover:bg-blue-600/10 rounded-full">
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>attach_file</span>
                </button>
                <button className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors hover:bg-blue-600/10 rounded-full">
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>image</span>
                </button>
              </div>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-24 pr-16 py-4 text-sm text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 focus:outline-none resize-none transition-all"
                placeholder={`Ask your ${subjectLabel} anything...`}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <div className="absolute inset-y-0 right-4 flex items-center">
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white size-10 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>send</span>
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-slate-500 mt-4 uppercase tracking-widest font-medium">
              MYThink AI may provide inaccurate info. Double-check your formulas.
            </p>
          </div>
        </main>
      </div>

      {/* Simulation modal */}
      {openArtifact && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-5xl max-h-[92vh] rounded-2xl overflow-hidden border border-slate-700 bg-[#101622] flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 shrink-0 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">Interactive Simulation</span>
              <button
                onClick={() => setOpenArtifact(null)}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded hover:bg-slate-800 transition"
              >
                ✕ Close (Esc)
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <iframe
                srcDoc={openArtifact}
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-0"
                title="Interactive Simulation"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notes modal */}
      {showNote && note && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[88vh] rounded-2xl overflow-hidden border border-slate-700 bg-[#101622] flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 shrink-0 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">Study Notes</span>
              <button
                onClick={() => setShowNote(false)}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded hover:bg-slate-800 transition"
              >
                ✕ Close (Esc)
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{note.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
