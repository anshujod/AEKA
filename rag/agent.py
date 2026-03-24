from langgraph.graph import StateGraph, END
from memory import ConversationMemory, SemanticMemory
from typing import TypedDict
from langchain_core.documents import Document
import re
import json
import os
import ast
from datetime import datetime, timezone

from retriever import get_retriever
from reranker import rerank
from generator import generate_answer
from multi_query import generate_multi_queries
from llm import chat_completion
from config import STRICT_DOC_ONLY

# ---------- MEMORY ----------
conv_memory = ConversationMemory()
semantic_memory = SemanticMemory()

# Track most recent explicit subject to resolve pronouns across turns
last_subject = "general"

# ---------- STATE ----------
class AgentState(TypedDict):
    query: str
    rewritten_query: str
    docs: list
    answer: str
    route: str
    memory_docs: list
    subject: str
    is_fact: bool
    retry_count: int
    full_docs: list
    tool_action: str
    tool_result: str
    next_step: str

# ---------- INIT ----------
retriever = get_retriever()
MODE = os.getenv("AGENT_MODE", "debug").lower()  # debug | user
SHOW_STEPS = MODE == "debug"
OUT_OF_SCOPE_RESPONSE = "I can only answer questions that are supported by the uploaded document(s)."

COLORS = {
    "step": "\033[94m",      # blue
    "action": "\033[96m",    # cyan
    "warn": "\033[93m",      # yellow
    "reset": "\033[0m",
}

REFERENTIAL_TERMS = re.compile(
    r"\b(this|that|these|those|it|its|they|them|their|theirs|he|him|his|she|her|hers|former|latter)\b",
    re.IGNORECASE,
)

def log(msg, kind="step"):
    if not SHOW_STEPS:
        return
    color = COLORS.get(kind, "")
    reset = COLORS["reset"]
    print(f"{color}{msg}{reset}")

def set_mode(mode: str):
    global MODE, SHOW_STEPS
    MODE = mode
    SHOW_STEPS = MODE == "debug"
    prefix = COLORS.get("warn", "")
    reset = COLORS["reset"]
    print(f"{prefix}Mode set to {MODE}{reset}")

# ---------- TOOLING ----------
SAFE_OPS = {ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.Mod}

def safe_eval(expr: str):
    node = ast.parse(expr, mode="eval")

    def _eval(n):
        if isinstance(n, ast.Expression):
            return _eval(n.body)
        if isinstance(n, ast.Num):
            return n.n
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
            return n.value
        if isinstance(n, ast.BinOp) and type(n.op) in SAFE_OPS:
            return _eval(n.left) + _eval(n.right) if isinstance(n.op, ast.Add) else \
                   _eval(n.left) - _eval(n.right) if isinstance(n.op, ast.Sub) else \
                   _eval(n.left) * _eval(n.right) if isinstance(n.op, ast.Mult) else \
                   _eval(n.left) / _eval(n.right) if isinstance(n.op, ast.Div) else \
                   _eval(n.left) ** _eval(n.right) if isinstance(n.op, ast.Pow) else \
                   _eval(n.left) % _eval(n.right)
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
            return +_eval(n.operand) if isinstance(n.op, ast.UAdd) else -_eval(n.operand)
        raise ValueError("Unsupported expression")

    return _eval(node)

def detect_tool(state):
    q = state["query"].lower()
    has_num = bool(re.search(r"\d", q))
    wants_percent = any(w in q for w in ["percent", "percentage", "%", "to %", "to percent"])

    # CGPA percent conversion only when a number is present
    if "cgpa" in q and wants_percent and has_num:
        return "calc"

    # Generic arithmetic only if both operator/percent word and a number appear
    if has_num and any(op in q for op in ["+", "-", "*", "/", "percent", "percentage", "%"]):
        return "calc"

    if any(w in q for w in ["today", "date", "day", "time"]):
        return "date"
    return None

def tool_router(state: AgentState):
    if STRICT_DOC_ONLY:
        return {"tool_action": ""}
    tool = detect_tool(state)
    if tool:
        log(f"🛠️ TOOL ROUTER → {tool}", "action")
        return {"tool_action": tool}
    return {"tool_action": ""}

def tool_execute(state: AgentState):
    action = state.get("tool_action")
    q = state["query"]
    q_lower = q.lower()
    result = "No tool executed."

    if action == "calc":
        # CGPA to percent helper (assume 10-scale; use 9.5 factor)
        match = re.search(r"([0-9]+\.?[0-9]*)", q_lower)
        if match and "cgpa" in q_lower and ("percent" in q_lower or "percentage" in q_lower or "%" in q_lower):
            cgpa = float(match.group(1))
            pct = round(cgpa * 9.5, 2)
            result = f"{cgpa} CGPA ≈ {pct}% (10-point scale, factor 9.5)"
        else:
            expr = re.sub(r"percent", "/100", q_lower)
            expr = re.sub(r"percentage", "/100", expr)
            nums = re.findall(r"[0-9.+*/()% ]+", expr)
            if not nums:
                result = "Calculation failed."
            else:
                expr_clean = nums[0]
                try:
                    val = safe_eval(expr_clean)
                    result = f"{expr_clean.strip()} = {val}"
                except Exception:
                    result = "Calculation failed."
    elif action == "date":
        now = datetime.now().astimezone()
        result = now.strftime("Today is %Y-%m-%d (%A), time %H:%M %Z")
    log(f"Tool result: {result}", "step")
    return {"answer": result, "tool_result": result, "tool_action": action, "streamed": False}

# ---------- ROUTER ----------
def decide(state: AgentState):
    log("🧭 ROUTER STEP", "action")

    subject = state.get("subject", "general")

    if STRICT_DOC_ONLY:
        if subject == "user":
            log("Router: USER -> REJECT (strict doc mode)", "warn")
            return {"route": "reject"}
        log("Router: STRICT_DOC_ONLY -> RAG", "action")
        return {"route": "rag"}

    # Subject-first routing
    if subject == "user":
        log("Router: MEMORY (by subject)", "action")
        return {"route": "rag"}

    if subject == "document":
        log("Router: DOCUMENT (by subject)", "action")
        return {"route": "rag"}

    prompt = f"""
Classify query:

DOCUMENT → asking about the indexed documents
GENERAL → conceptual knowledge or chat not tied to the indexed documents

Return ONLY:
DOCUMENT / GENERAL

Query:
{state['query']}
"""

    res = chat_completion(messages=[{"role": "user", "content": prompt}])

    decision = res.choices[0].message.content.strip().upper()
    log(f"Router: {decision}", "action")

    if decision == "GENERAL" and STRICT_DOC_ONLY:
        return {"route": "reject"}

    if decision == "GENERAL":
        return {"route": "direct"}

    # Fallback: when classifier uncertain, default to retrieval path
    return {"route": "rag"}

# ---------- FACT DETECTION ----------
def fact_detect(state: AgentState):
    log("🧠 FACT DETECT", "action")

    if STRICT_DOC_ONLY and state.get("subject") != "user":
        return {"is_fact": False}

    prompt = f"""
Decide if the user is PROVIDING a durable factual statement about the subject below.

Subject: {state.get('subject', 'general')}

Return exactly FACT or QUESTION.

Mark QUESTION if the user is asking, hypothetical, or unclear.
Accept FACT for declarative statements about the user or the indexed documents.

Examples FACT (subject=user):
- My name is Alice
- I prefer concise answers

Examples FACT (subject=document):
- This document is the Q4 report
- The paper says the experiment used 500 samples

Examples QUESTION:
- What does this document say about revenue?
- Explain this section

Query:
{state['query']}
"""

    res = chat_completion(messages=[{"role": "user", "content": prompt}])

    decision = res.choices[0].message.content.strip().upper()

    return {"is_fact": decision == "FACT"}


def extract_structured_fact(statement: str, subject: str):
    """Use LLM to filter and structure user-provided facts about the user or document corpus."""
    prompt = f"""
You are a fact filter.

Subject: {subject}

Keep ONLY declarative factual statements about the subject. Reject questions and unrelated chatter.

Allowed categories:
- personal_data (name, contact, demographic)
- preference (answer style, goals, persistent preferences)
- background (work, education, role, domain context)
- document_fact (claims or labels about the indexed documents)
- numeric_fact (scores, counts, metrics)

If the statement is NOT an allowed fact, respond with REJECT.

If it is allowed, respond ONLY with compact JSON:
{{"category": "<category>", "fact": "<concise fact>", "subject": "{subject}"}}

Statement:
{statement}
"""

    res = chat_completion(messages=[{"role": "user", "content": prompt}])

    content = res.choices[0].message.content.strip()

    if content.upper().startswith("REJECT"):
        return None

    try:
        data = json.loads(content)
        if data.get("subject") != subject:
            return None
        if data.get("category") not in {"personal_data", "preference", "background", "document_fact", "numeric_fact"}:
            return None
        return data
    except Exception:
        return None

def subject_tracker(state):
    global last_subject

    q_raw = state["query"]
    q = q_raw.lower()
    document_terms = r"\b(document|documents|file|files|paper|papers|article|articles|pdf|pdfs|text|texts|report|reports|manual|manuals|book|books|chapter|chapters|source|sources|corpus|notes?)\b"
    referential_terms = r"\b(this|that|these|those|it|its|they|them|their|theirs|he|him|his|she|her|hers)\b"

    if re.search(document_terms, q):
        last_subject = "document"
        return {"subject": "document"}

    # First-person (possessive/subject) → user
    if re.search(r"\b(i|me|my|mine|we|our|ours)\b", q):
        last_subject = "user"
        return {"subject": "user"}

    # Pronouns and referential phrases rely on recent context; default to documents.
    if re.search(referential_terms, q):
        fallback = last_subject if last_subject != "general" else "document"
        return {"subject": fallback}

    # Definition-style questions without subjects → general
    if re.search(r"\bwhat is\b|\bdefine\b|\bexplain\b", q):
        return {"subject": "general"}

    return {"subject": "general"}
# ---------- STORE FACT ----------
def store_fact(state: AgentState):
    log("💾 STORE FACT", "action")
    subject = state.get("subject", "user")
    fact_payload = extract_structured_fact(state["query"], subject)

    if not fact_payload:
        return {"answer": "Noted. (No storable fact detected.)"}

    fact_text = json.dumps(fact_payload)
    semantic_memory.add(fact_text, metadata={"category": fact_payload["category"], "subject": subject})
    conv_memory.add(state["query"], "Noted.")

    return {"answer": "Got it. I will remember that."}

# ---------- REJECT ----------
def reject_out_of_scope(state: AgentState):
    log("🚫 OUT OF SCOPE", "warn")
    return {"answer": OUT_OF_SCOPE_RESPONSE, "streamed": False}

# ---------- DIRECT ----------
def direct_answer(state: AgentState):
    log("⚡ DIRECT LLM", "action")

    res = chat_completion(messages=[{"role": "user", "content": state["query"]}])

    return {"answer": res.choices[0].message.content, "streamed": False}

# ---------- MEMORY SEARCH ----------
def memory_search(state: AgentState):
    log("🧠 MEMORY SEARCH", "action")

    if STRICT_DOC_ONLY:
        return {
            "memory_docs": [],
            "rewritten_query": state.get("rewritten_query") or state["query"]
        }

    subject = state.get("subject", "general")
    base_query = state.get("rewritten_query") or state["query"]
    # Bias search with subject tag so user/document facts rank correctly
    search_query = f"{base_query} ({subject})" if subject in {"user", "document"} else base_query
    mem_docs = semantic_memory.search(search_query)

    log(f"Memory hits: {len(mem_docs)}", "step")

    return {
        "memory_docs": mem_docs,
        "rewritten_query": search_query
    }

# ---------- REWRITE ----------
def rewrite(state: AgentState):
    log("✏️ REWRITE", "action")

    conv_context = conv_memory.get_context()
    subject = state.get("subject", "general")
    mem_query = f"{state['query']} ({subject})" if subject in {"user", "document"} else state["query"]
    mem_facts = semantic_memory.search(mem_query)
    fact_text = "\n".join([d.page_content for d in mem_facts]) if mem_facts else "None"
    retry_num = state.get("retry_count", 0)
    base_query = state.get("rewritten_query", state["query"])

    # For standalone questions, avoid LLM rewrite so prior turns do not leak
    # into the next retrieval query.
    if retry_num == 0 and not REFERENTIAL_TERMS.search(base_query):
        log(f"Rewrite skipped: {base_query}", "step")
        return {"rewritten_query": base_query}

    prompt = f"""
Rewrite the user's query for retrieval with pronouns resolved.

Context:
- Subject: {state.get('subject', 'general')}
- Indexed corpus: the currently ingested documents
- Conversation:\n{conv_context or 'None'}
- Known memory facts (JSON):\n{fact_text}
- Retry attempt: {retry_num}
- Previous rewrite: {state.get('rewritten_query', 'None')}

Rules:
- Resolve pronouns like it/that/this/he/she/they to the correct entity using the conversation and facts.
- If subject is "user", keep the wording aligned to the user's self-reference.
- If subject is "document", rewrite toward the relevant document, section, topic, or named entity from the indexed corpus.
- If retry attempt > 0, rephrase with different wording, add synonymous keywords that could help retrieval, and avoid repeating the exact previous phrasing.
- Do NOT invent new facts; keep meaning and intent.
- Return ONLY the rewritten query text.

Original query:
{base_query}
"""

    res = chat_completion(messages=[{"role": "user", "content": prompt}])

    rq = res.choices[0].message.content.strip()

    log(f"Rewritten: {rq}", "step")

    return {"rewritten_query": rq}

# ---------- RETRIEVE ----------
def retrieve(state: AgentState):
    log("🔎 RETRIEVE", "action")

    queries = generate_multi_queries(state["rewritten_query"])

    docs = []
    for q in queries:
        d = retriever.invoke(q)
        if d:
            docs.extend(d)

    unique = {}
    for d in docs:
        unique[d.page_content] = d

    final_docs = list(unique.values())

    log(f"Retrieved: {len(final_docs)}", "step")

    return {"docs": final_docs}

# ---------- RERANK ----------
def rerank_docs(state: AgentState):
    log("📊 RERANK", "action")

    if not state["docs"]:
        return {"docs": []}

    try:
        top = rerank(state["rewritten_query"], state["docs"])
        log(f"Reranked: {len(top)}", "step")
        return {"docs": top}
    except:
        return {"docs": state["docs"]}

# ---------- GENERATE ----------
def generate(state: AgentState):
    log("🧠 GENERATE", "action")

    all_docs = state.get("memory_docs", []) + state.get("docs", [])

    if not all_docs:
        return {"answer": "I can't answer that from the uploaded document(s)."}

    answer = generate_answer(
        state["rewritten_query"],
        all_docs,
        "" if STRICT_DOC_ONLY else conv_memory.get_context()
    )

    conv_memory.add(state["query"], answer)

    return {"answer": answer, "streamed": False}

# ---------- RETRIEVAL EVAL ----------
def evaluate_retrieval(state: AgentState):
    log("🧪 EVALUATE RETRIEVAL", "action")

    retry_count = state.get("retry_count", 0)
    docs = state.get("docs", [])
    full_docs = state.get("full_docs", docs)

    # Quick confidence heuristic: empty docs -> low
    if not docs:
        return {
            "next_step": "retry" if retry_count < 2 else "reject",
            "retry_count": retry_count,
            "docs": full_docs
        }

    # Use LLM to estimate answerability from top docs
    sample_context = "\n".join([d.page_content[:400] for d in docs[:2]])
    prompt = f"""
Given the query and top retrieved snippets, is the answer likely present?

Respond with HIGH or LOW.

Query: {state['rewritten_query']}

Snippets:
{sample_context}
"""
    res = chat_completion(messages=[{"role": "user", "content": prompt}])

    decision = res.choices[0].message.content.strip().upper()
    log(f"Retrieval confidence: {decision}", "step")

    if decision.startswith("LOW") and retry_count < 2:
        return {"next_step": "retry", "retry_count": retry_count + 1, "docs": full_docs}

    if decision.startswith("LOW") and STRICT_DOC_ONLY:
        return {"next_step": "reject", "retry_count": retry_count, "docs": full_docs}

    # On final pass, fall back to full docs to maximize evidence
    return {"next_step": "generate", "retry_count": retry_count, "docs": full_docs}

# ---------- CONTEXT FILTER ----------
def context_filter(state: AgentState):
    log("🧹 CONTEXT FILTER", "action")

    docs = state.get("docs", [])
    if not docs:
        return {"docs": []}

    # Deduplicate by content
    deduped = []
    seen = set()
    for d in docs:
        if d.page_content in seen:
            continue
        seen.add(d.page_content)
        deduped.append(d)

    # Dynamic budget based on query length (characters)
    query_len = len(state.get("rewritten_query", state["query"]))
    budget_chars = max(2000, min(5000, query_len * 20))

    filtered_docs = []
    current_budget = 0

    for d in deduped:
        remaining = budget_chars - current_budget
        if remaining <= 0:
            break

        # If chunk already small, keep as-is
        if len(d.page_content) <= min(remaining, 600):
            filtered_docs.append(d)
            current_budget += len(d.page_content)
            continue

        prompt = f"""
Extract the 3-5 most important sentences for answering the query.
Keep under {min(remaining, 600)} characters. Preserve factual details and numbers.

Query:
{state.get('rewritten_query', state['query'])}

Chunk:
{d.page_content}
"""
        try:
            res = chat_completion(messages=[{"role": "user", "content": prompt}])
            summary = res.choices[0].message.content.strip()
            filtered_docs.append(Document(page_content=summary, metadata=d.metadata))
            current_budget += len(summary)
        except Exception:
            # Fallback to original chunk if summarization fails
            filtered_docs.append(d)
            current_budget += len(d.page_content)

    return {"docs": filtered_docs, "full_docs": deduped}

# ---------- GRAPH ----------
workflow = StateGraph(AgentState)

workflow.add_node("decide", decide)
workflow.add_node("fact", fact_detect)
workflow.add_node("store", store_fact)
workflow.add_node("direct", direct_answer)
workflow.add_node("reject", reject_out_of_scope)
workflow.add_node("rewrite", rewrite)
workflow.add_node("memory", memory_search)
workflow.add_node("retrieve", retrieve)
workflow.add_node("rerank", rerank_docs)
workflow.add_node("context_filter", context_filter)
workflow.add_node("generate", generate)
workflow.add_node("evaluate", evaluate_retrieval)
workflow.add_node("tool_router", tool_router)
workflow.add_node("tool_execute", tool_execute)

workflow.set_entry_point("tool_router")
workflow.add_conditional_edges(
    "tool_router",
    lambda s: "tool" if s.get("tool_action") else "subject",
    {
        "tool": "tool_execute",
        "subject": "subject"
    }
)

workflow.add_edge("tool_execute", END)
workflow.add_node("subject", subject_tracker)
workflow.add_edge("subject", "decide")

workflow.add_conditional_edges(
    "decide",
    lambda s: s["route"],
    {
        "direct": "direct",
        "reject": "reject",
        "rag": "fact"
    }
)

workflow.add_conditional_edges(
    "fact",
    lambda s: "store" if s["is_fact"] else "rewrite",
    {
        "store": "store",
        "rewrite": "rewrite"
    }
)

workflow.add_edge("store", END)

workflow.add_edge("rewrite", "memory")

workflow.add_conditional_edges(
    "memory",
    lambda s: "generate" if s["memory_docs"] else "retrieve",
    {
        "generate": "generate",
        "retrieve": "retrieve"
    }
)


workflow.add_edge("retrieve", "rerank")
workflow.add_edge("rerank", "context_filter")
workflow.add_edge("context_filter", "evaluate")

workflow.add_conditional_edges(
    "evaluate",
    lambda s: s.get("next_step", "generate"),
    {
        "generate": "generate",
        "reject": "reject",
        "retry": "rewrite"
    }
)

workflow.add_edge("direct", END)
workflow.add_edge("reject", END)
workflow.add_edge("generate", END)

app = workflow.compile()

# ---------- RUN ----------
def run_agent():
    print(f"AGENT MODE: {MODE} (type :debug or :user to switch, :exit to quit)")
    while True:
        q = input("\nAsk: ")
        if q.lower() in ["exit", ":exit"]:
            break
        if q.lower() == ":debug":
            set_mode("debug")
            continue
        if q.lower() == ":user":
            set_mode("user")
            continue
        result = app.invoke({"query": q})
        # Tool and direct responses may not stream; print if present or if generate didn't stream
        answer = result.get("answer")
        streamed = result.get("streamed", False)
        if answer and not streamed:
            print("\n🤖 Answer:\n")
            print(answer)

if __name__ == "__main__":
    run_agent()
