// Shared TypeScript types

export interface Session {
  id: string;
  subject: string;
  title?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  viz_data?: VizData;
}

export interface VizData {
  type: string;
  expression: string;
  xRange: [number, number];
  label: string;
}

export interface Note {
  id: string;
  session_id: string;
  content: string;
  created_at: string;
}
