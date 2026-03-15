import os
import asyncio
import importlib.util
from pathlib import Path
import sys
import re
import json

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# Load agent module directly to avoid clashing with rag.py script
ROOT = Path(__file__).parent
AGENT_PATH = ROOT / "rag" / "agent.py"
sys.path.insert(0, str(ROOT / "rag"))
spec = importlib.util.spec_from_file_location("rag_agent", AGENT_PATH)
agent_module = importlib.util.module_from_spec(spec)  # type: ignore
assert spec and spec.loader
spec.loader.exec_module(agent_module)  # type: ignore
agent_app = agent_module.app  # type: ignore
semantic_memory = agent_module.semantic_memory  # type: ignore

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/chat")
async def chat(body: dict):
    """
    Streaming wrapper around the LangGraph agent.
    Expects JSON: { "message": "<text>" } and returns streamed tokens.
    """
    message = body.get("message", "")

    # Heuristic: capture CGPA facts stated by the user (any form)
    cgpa_match = re.search(r"(?:cgpa[^0-9]*([0-9]+(?:\.[0-9]+)?)|([0-9]+(?:\.[0-9]+)?)\s*cgpa)", message, re.IGNORECASE)
    if cgpa_match:
        cgpa_val = cgpa_match.group(1) or cgpa_match.group(2)
        fact = {
            "category": "education",
            "fact": f"CGPA: {cgpa_val}",
            "subject": "resume"
        }
        semantic_memory.add(json.dumps(fact), metadata={"category": "education"})

    # Run the agent in a background thread (LangGraph + OpenAI are sync here)
    def run_agent():
        result = agent_app.invoke({"query": message})
        return result.get("answer", "")

    async def stream():
        try:
            answer = await asyncio.to_thread(run_agent)
        except Exception as exc:
            yield f"Error: {exc}"
            return

        # Chunk the answer for smoother typing effect
        for token in answer.split():
            yield token + " "
            await asyncio.sleep(0.01)

    return StreamingResponse(stream(), media_type="text/plain")
