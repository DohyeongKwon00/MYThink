from typing import Optional
from pydantic import BaseModel


class SessionCreate(BaseModel):
    subject: str


class SessionResponse(BaseModel):
    id: str
    subject: str
    title: Optional[str] = None


class VizData(BaseModel):
    type: str
    expression: str
    xRange: list[float]
    label: str


class ChatRequest(BaseModel):
    session_id: str
    content: str


class ChatResponse(BaseModel):
    id: str
    role: str
    content: str
    viz_data: Optional[VizData] = None


class NoteResponse(BaseModel):
    id: str
    session_id: str
    content: str
    created_at: str
