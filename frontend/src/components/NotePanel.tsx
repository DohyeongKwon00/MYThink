"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { apiFetch } from "@/lib/api";
import type { Note } from "@/types";

interface Props {
  sessionId: string;
}

export default function NotePanel({ sessionId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  async function generateNotes() {
    setLoading(true);
    try {
      const note = await apiFetch<Note>(`/api/notes/${sessionId}`, { method: "POST" });
      setNotes([note]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-gray-200 text-sm">Study Notes</h2>
        <button
          onClick={generateNotes}
          disabled={loading}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-600 disabled:opacity-40"
        >
          {loading ? "Generating…" : "Generate Notes"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {notes.length === 0 ? (
          <p className="text-center text-gray-500 text-sm mt-8">
            Notes will appear here after you generate them.
          </p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{notes[0].content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
