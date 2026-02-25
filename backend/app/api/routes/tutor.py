import json
import re
from typing import Optional

from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.core.openai import get_openai_client
from app.core.supabase import get_supabase_client
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    NoteResponse,
    SessionCreate,
    SessionResponse,
    VizData,
)

router = APIRouter(prefix="/api")

SUBJECT_PROMPTS = {
    "math": (
        "You are an expert math tutor. Explain concepts clearly with examples. "
        "When relevant, include a visualization hint at the end of your response as a JSON block:\n"
        '```json\n{"viz_data": {"type": "function2d", "expression": "<math expr using x>", '
        '"xRange": [-5, 5], "label": "<label>"}}\n```\n'
        "Only include viz_data when a 2D function graph would genuinely help understanding."
    ),
    "physics": (
        "You are an expert physics tutor. Explain concepts clearly with examples. "
        "When relevant, include a visualization hint at the end of your response as a JSON block:\n"
        '```json\n{"viz_data": {"type": "function2d", "expression": "<math expr using x>", '
        '"xRange": [-5, 5], "label": "<label>"}}\n```\n'
        "Only include viz_data when a 2D function graph would genuinely help understanding."
    ),
}

DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful AI tutor. Explain concepts clearly with examples."
)


def _get_system_prompt(subject: str) -> str:
    return SUBJECT_PROMPTS.get(subject.lower(), DEFAULT_SYSTEM_PROMPT)


def _parse_viz_data(content: str) -> tuple[str, Optional[VizData]]:
    """Extract viz_data JSON block from assistant response."""
    pattern = r"```json\s*(\{.*?\})\s*```"
    match = re.search(pattern, content, re.DOTALL)
    if not match:
        return content, None
    try:
        data = json.loads(match.group(1))
        vd = data.get("viz_data")
        if vd:
            viz = VizData(**vd)
            clean_content = content[: match.start()].rstrip()
            return clean_content, viz
    except Exception:
        pass
    return content, None


# ---------------------------------------------------------------------------
# Sessions
# ---------------------------------------------------------------------------


@router.post("/sessions", response_model=SessionResponse)
async def create_session(body: SessionCreate):
    db = get_supabase_client()
    result = db.table("sessions").insert({"subject": body.subject}).execute()
    row = result.data[0]
    return SessionResponse(id=row["id"], subject=row["subject"], title=row.get("title"))


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


@router.get("/chat/{session_id}", response_model=list[ChatResponse])
async def get_messages(session_id: str):
    db = get_supabase_client()
    result = (
        db.table("messages")
        .select("id, role, content")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    return [
        ChatResponse(id=r["id"], role=r["role"], content=r["content"])
        for r in result.data
    ]


@router.post("/chat", response_model=ChatResponse)
async def send_message(body: ChatRequest):
    db = get_supabase_client()
    openai = get_openai_client()

    # Fetch session to get subject
    session_result = (
        db.table("sessions").select("subject").eq("id", body.session_id).execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    subject = session_result.data[0]["subject"]

    # Fetch recent message history (last 20)
    history_result = (
        db.table("messages")
        .select("role, content")
        .eq("session_id", body.session_id)
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    history = list(reversed(history_result.data))

    # Build message list for GPT
    messages = [{"role": "system", "content": _get_system_prompt(subject)}]
    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": body.content})

    # Call GPT
    completion = await openai.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
    )
    raw_response = completion.choices[0].message.content or ""

    # Parse viz_data out of response
    clean_response, viz_data = _parse_viz_data(raw_response)

    # Embed user message
    user_embedding_response = await openai.embeddings.create(
        model="text-embedding-3-small", input=body.content
    )
    user_embedding = user_embedding_response.data[0].embedding

    # Embed assistant response
    asst_embedding_response = await openai.embeddings.create(
        model="text-embedding-3-small", input=clean_response
    )
    asst_embedding = asst_embedding_response.data[0].embedding

    # Save user message
    db.table("messages").insert(
        {
            "session_id": body.session_id,
            "role": "user",
            "content": body.content,
            "embedding": user_embedding,
        }
    ).execute()

    # Save assistant message
    asst_result = (
        db.table("messages")
        .insert(
            {
                "session_id": body.session_id,
                "role": "assistant",
                "content": clean_response,
                "embedding": asst_embedding,
            }
        )
        .execute()
    )
    asst_row = asst_result.data[0]

    return ChatResponse(
        id=asst_row["id"],
        role="assistant",
        content=clean_response,
        viz_data=viz_data,
    )


# ---------------------------------------------------------------------------
# Notes
# ---------------------------------------------------------------------------


@router.post("/notes/{session_id}", response_model=NoteResponse)
async def generate_notes(session_id: str):
    db = get_supabase_client()
    openai = get_openai_client()

    # Fetch all messages for context
    history_result = (
        db.table("messages")
        .select("role, content")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    if not history_result.data:
        raise HTTPException(status_code=400, detail="No messages in session")

    conversation = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in history_result.data
    )

    completion = await openai.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a study note generator. Given a tutoring conversation, "
                    "produce concise, well-structured markdown study notes. "
                    "Include key concepts, formulas, and examples. "
                    "Use headers, bullet points, and code blocks as appropriate."
                ),
            },
            {
                "role": "user",
                "content": f"Generate study notes from this tutoring session:\n\n{conversation}",
            },
        ],
    )
    notes_content = completion.choices[0].message.content or ""

    # Save notes (replace existing for this session)
    db.table("notes").delete().eq("session_id", session_id).execute()
    note_result = (
        db.table("notes")
        .insert({"session_id": session_id, "content": notes_content})
        .execute()
    )
    note_row = note_result.data[0]

    return NoteResponse(
        id=note_row["id"],
        session_id=session_id,
        content=notes_content,
        created_at=note_row["created_at"],
    )


@router.get("/notes/{session_id}", response_model=list[NoteResponse])
async def get_notes(session_id: str):
    db = get_supabase_client()
    result = (
        db.table("notes")
        .select("id, session_id, content, created_at")
        .eq("session_id", session_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [
        NoteResponse(
            id=r["id"],
            session_id=r["session_id"],
            content=r["content"],
            created_at=r["created_at"],
        )
        for r in result.data
    ]
