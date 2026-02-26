import asyncio
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

_MATH_FORMAT = (
    "IMPORTANT: Always render math using these exact LaTeX delimiters — "
    "inline math: $...$, display/block math: $$...$$. "
    "Do NOT use \\(...\\) or \\[...\\] or ( ) or [ ] as math delimiters. "
    "For example, write $\\mathbf{v}$ not \\(\\mathbf{v}\\), "
    "and $$E = mc^2$$ not \\[E = mc^2\\]."
)

# Keywords that trigger a separate artifact generation call
_ARTIFACT_KEYWORDS = {
    "orbit", "orbital", "pendulum", "projectile", "wave", "oscillat",
    "spring", "harmonic", "gravity", "gravit", "planet", "solar", "kepler",
    "electric field", "magnetic field", "vector field", "circuit",
    "refract", "diffract", "interfer", "lissajous", "fourier",
    "parametric", "transform", "rotation", "fractal", "fluid",
    "collision", "momentum", "energy conserv", "thermodynamic",
    "sort", "algorithm", "graph traversal", "binary tree",
}

SUBJECT_PROMPTS = {
    "math": (
        "You are an expert math tutor. Explain concepts clearly with examples. "
        + _MATH_FORMAT + " "
        "When relevant, include a 2D function graph hint at the end of your response:\n"
        '```json\n{"viz_data": {"type": "function2d", "expression": "<math expr using x>", '
        '"xRange": [-5, 5], "label": "<label>"}}\n```\n'
        "Only include viz_data when a simple 2D function graph would help understanding."
    ),
    "physics": (
        "You are an expert physics tutor. Explain concepts clearly with examples. "
        + _MATH_FORMAT + " "
        "When relevant, include a 2D function graph hint at the end of your response:\n"
        '```json\n{"viz_data": {"type": "function2d", "expression": "<math expr using x>", '
        '"xRange": [-5, 5], "label": "<label>"}}\n```\n'
        "Only include viz_data for simple function graphs."
    ),
}

DEFAULT_SYSTEM_PROMPT = (
    "You are a helpful AI tutor. Explain concepts clearly with examples. "
    + _MATH_FORMAT
)


def _needs_artifact(user_message: str) -> bool:
    msg = user_message.lower()
    return any(kw in msg for kw in _ARTIFACT_KEYWORDS)


_ARTIFACT_TEMPLATE = (
    "<!DOCTYPE html>\n"
    "<html lang='en'>\n"
    "<head><meta charset='UTF-8'>\n"
    "<style>\n"
    "* { margin:0; padding:0; box-sizing:border-box; }\n"
    "body { background:#0f172a; color:#e2e8f0; font-family:sans-serif; overflow:hidden; }\n"
    "#controls { position:fixed; top:10px; left:50%; transform:translateX(-50%);\n"
    "  background:rgba(15,23,42,0.85); border:1px solid #334155; border-radius:10px;\n"
    "  padding:8px 16px; display:flex; gap:16px; align-items:center; font-size:13px; z-index:10; }\n"
    "label { display:flex; flex-direction:column; gap:3px; color:#94a3b8; }\n"
    "input[type=range] { width:120px; accent-color:#818cf8; }\n"
    "</style></head>\n"
    "<body>\n"
    "<div id='controls'></div>\n"
    "<script src='https://unpkg.com/three@0.160.0/build/three.min.js'></script>\n"
    "<script>\n"
    "const controls = document.getElementById('controls');\n"
    "const scene = new THREE.Scene();\n"
    "scene.background = new THREE.Color(0x0f172a);\n"
    "const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 10000);\n"
    "const renderer = new THREE.WebGLRenderer({ antialias: true });\n"
    "renderer.setSize(window.innerWidth, window.innerHeight);\n"
    "renderer.setPixelRatio(window.devicePixelRatio);\n"
    "document.body.appendChild(renderer.domElement);\n"
    "window.addEventListener('resize', () => {\n"
    "  camera.aspect = window.innerWidth/window.innerHeight;\n"
    "  camera.updateProjectionMatrix();\n"
    "  renderer.setSize(window.innerWidth, window.innerHeight);\n"
    "});\n"
    "// --- simulation code ---\n"
    "__SIMULATION_CODE__\n"
    "// --- end simulation code ---\n"
    "function _loop() {\n"
    "  requestAnimationFrame(_loop);\n"
    "  if (typeof update === 'function') update();\n"
    "  renderer.render(scene, camera);\n"
    "}\n"
    "_loop();\n"
    "</script>\n"
    "</body></html>"
)


async def _generate_artifact_html(openai_client, topic: str) -> Optional[str]:
    """Generate Three.js simulation code, inject into fixed HTML template."""
    print(f"[artifact] Starting generation for: {topic[:80]}")
    try:
        completion = await openai_client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert at writing interactive educational simulations using Three.js.\n"
                        "Output ONLY raw JavaScript — no HTML tags, no markdown, no code fences, no explanation.\n\n"
                        "These variables are already in scope:\n"
                        "  scene    — THREE.Scene (background already set to #0f172a)\n"
                        "  camera   — THREE.PerspectiveCamera\n"
                        "  renderer — THREE.WebGLRenderer (already sized to viewport)\n"
                        "  controls — div element: set controls.innerHTML for sliders/labels\n"
                        "  THREE    — the Three.js library\n\n"
                        "Your code must:\n"
                        "1. Set controls.innerHTML with 2-3 labeled range sliders for key parameters\n"
                        "2. Position the camera appropriately for the scene\n"
                        "3. Add meshes/lights/objects to scene\n"
                        "4. Define: function update() { /* called every frame — advance simulation here */ }\n"
                        "Do NOT call renderer.render() or requestAnimationFrame() — the template handles the loop.\n"
                        "Colors: #818cf8 purple, #34d399 green, #f59e0b amber. Keep code concise."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Create an interactive Three.js simulation about: {topic}",
                },
            ],
            max_tokens=6000,
        )
        code = (completion.choices[0].message.content or "").strip()
        fence_match = re.search(r"```(?:\w+)?\n?([\s\S]*?)```", code)
        if fence_match:
            code = fence_match.group(1).strip()
        html = _ARTIFACT_TEMPLATE.replace("__SIMULATION_CODE__", code)
        print(f"[artifact] Generated, code_len={len(code)}, html_len={len(html)}")
        return html
    except Exception as e:
        print(f"[artifact] Generation failed: {e}")
        return None


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


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions():
    db = get_supabase_client()
    result = (
        db.table("sessions")
        .select("id, subject, title, created_at")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )
    return [
        SessionResponse(
            id=r["id"],
            subject=r["subject"],
            title=r.get("title"),
            created_at=r.get("created_at"),
        )
        for r in result.data
    ]


@router.post("/sessions", response_model=SessionResponse)
async def create_session(body: SessionCreate):
    db = get_supabase_client()
    result = db.table("sessions").insert({"subject": body.subject}).execute()
    row = result.data[0]
    return SessionResponse(id=row["id"], subject=row["subject"], title=row.get("title"), created_at=row.get("created_at"))


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    db = get_supabase_client()
    try:
        session = db.table("sessions").select("id").eq("id", session_id).execute()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    if not session.data:
        raise HTTPException(status_code=404, detail="Session not found")
    db.table("notes").delete().eq("session_id", session_id).execute()
    db.table("messages").delete().eq("session_id", session_id).execute()
    db.table("sessions").delete().eq("id", session_id).execute()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


@router.get("/chat/{session_id}", response_model=list[ChatResponse])
async def get_messages(session_id: str):
    db = get_supabase_client()
    result = (
        db.table("messages")
        .select("id, role, content, artifact")
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
    )
    return [
        ChatResponse(id=r["id"], role=r["role"], content=r["content"], artifact=r.get("artifact"))
        for r in result.data
    ]


@router.post("/chat", response_model=ChatResponse)
async def send_message(body: ChatRequest):
    db = get_supabase_client()
    openai = get_openai_client()

    # Fetch session to get subject and title
    session_result = (
        db.table("sessions").select("subject, title").eq("id", body.session_id).execute()
    )
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Session not found")
    subject = session_result.data[0]["subject"]
    is_first_message = session_result.data[0]["title"] is None

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
    needs_artifact = _needs_artifact(body.content)
    print(f"[viz] viz_data={viz_data is not None}, needs_artifact={needs_artifact}, raw_len={len(raw_response)}")

    # Run embeddings concurrently
    emb_user, emb_asst = await asyncio.gather(
        openai.embeddings.create(model="text-embedding-3-small", input=body.content),
        openai.embeddings.create(model="text-embedding-3-small", input=clean_response),
    )
    user_embedding = emb_user.data[0].embedding
    asst_embedding = emb_asst.data[0].embedding

    # Generate artifact separately (if needed)
    artifact = None
    if needs_artifact:
        artifact = await _generate_artifact_html(openai, body.content)

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
                "artifact": artifact,
            }
        )
        .execute()
    )
    asst_row = asst_result.data[0]

    # Generate session title from first message
    if is_first_message:
        try:
            title_completion = await openai.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Generate a concise chat title (5 words or fewer) that summarizes "
                            "the user's question. Return only the title, no quotes or punctuation."
                        ),
                    },
                    {"role": "user", "content": body.content},
                ],
                max_tokens=20,
            )
            title = (title_completion.choices[0].message.content or "").strip()
            if title:
                result = db.table("sessions").update({"title": title}).eq("id", body.session_id).execute()
                print(f"[title] Generated '{title}' for session {body.session_id}, result: {result.data}")
        except Exception as e:
            print(f"[title] Generation failed for session {body.session_id}: {e}")

    return ChatResponse(
        id=asst_row["id"],
        role="assistant",
        content=clean_response,
        viz_data=viz_data,
        artifact=artifact,
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
