"use client";

import { useState } from "react";
import { use } from "react";
import Chat from "@/components/Chat";
import NotePanel from "@/components/NotePanel";
import ThreeCanvas from "@/components/ThreeCanvas";
import type { VizData } from "@/types";

export default function ChatPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const [vizData, setVizData] = useState<VizData | null>(null);

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Left: Chat */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-gray-800">
        <Chat sessionId={sessionId} onVizData={setVizData} />
      </div>

      {/* Right: Notes + 3D */}
      <div className="flex flex-col w-96 shrink-0">
        <div className="flex-1 min-h-0 border-b border-gray-800">
          <ThreeCanvas vizData={vizData} />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <NotePanel sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
