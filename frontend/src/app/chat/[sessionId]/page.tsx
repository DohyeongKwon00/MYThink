"use client";

import { use, useEffect } from "react";
import Chat from "@/components/Chat";

export default function ChatPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-950 text-white flex">
      <Chat sessionId={sessionId} />
    </div>
  );
}
