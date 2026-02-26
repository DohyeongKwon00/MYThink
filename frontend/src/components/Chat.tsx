"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { apiFetch } from "@/lib/api";
import type { Message, Note } from "@/types";

function normalizeMath(content: string): string {
  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$${m}$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);
}

interface Props {
  sessionId: string;
}

export default function Chat({ sessionId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openArtifact, setOpenArtifact] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    apiFetch<Message[]>(`/api/chat/${sessionId}`).then(setMessages).catch(console.error);
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
      if (e.key === "Escape") { setOpenArtifact(null); setShowNote(false); }
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 shrink-0 flex items-center justify-between">
          <h2 className="font-semibold text-gray-200">AI Tutor</h2>
          <button
            onClick={generateNote}
            disabled={noteLoading || messages.length === 0}
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-40"
          >
            {noteLoading ? "Generating…" : "Generate Notes"}
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <p className="text-center text-gray-500 mt-16">Ask your tutor anything…</p>
          )}
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              ref={(el) => { msgRefs.current[idx] = el; }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-100"
                }`}
              >
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {normalizeMath(msg.content)}
                </ReactMarkdown>
                {msg.artifact && (
                  <button
                    onClick={() => setOpenArtifact(msg.artifact!)}
                    className="mt-3 flex items-center gap-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/30 transition w-full"
                  >
                    <span className="text-base">▶</span>
                    Open Interactive Simulation
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-400 rounded-2xl px-4 py-3 text-sm animate-pulse">
                Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-800 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              className="flex-1 resize-none rounded-xl bg-gray-800 px-4 py-3 text-sm text-gray-100 placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Simulation modal */}
      {openArtifact && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full h-full max-w-5xl max-h-[92vh] rounded-2xl overflow-hidden border border-gray-700 bg-gray-950 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-800 shrink-0 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-200">Interactive Simulation</span>
              <button
                onClick={() => setOpenArtifact(null)}
                className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-800 transition"
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
          <div className="w-full max-w-2xl max-h-[88vh] rounded-2xl overflow-hidden border border-gray-700 bg-gray-950 flex flex-col">
            <div className="px-4 py-2 border-b border-gray-800 shrink-0 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-200">Study Notes</span>
              <button
                onClick={() => setShowNote(false)}
                className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1 rounded hover:bg-gray-800 transition"
              >
                ✕ Close (Esc)
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
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
