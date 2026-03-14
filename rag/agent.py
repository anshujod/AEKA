from langgraph.graph import StateGraph, END
from memory import ConversationMemory, SemanticMemory
from typing import TypedDict
from openai import OpenAI
import re
import json

from retriever import get_retriever
from reranker import rerank
from generator import generate_answer
from multi_query import generate_multi_queries

# ---------- MEMORY ----------
conv_memory = ConversationMemory()
semantic_memory = SemanticMemory()

# Track most recent explicit subject to resolve pronouns across turns
last_subject = "resume"

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

# ---------- INIT ----------
client = OpenAI()
retriever = get_retriever()

# ---------- ROUTER ----------
def decide(state: AgentState):
    print("🧭 ROUTER STEP")

    subject = state.get("subject", "general")

    # Subject-first routing
    if subject == "user":
        print("Router: MEMORY (by subject)")
        return {"route": "rag"}

    if subject == "resume":
        print("Router: RESUME (by subject)")
        return {"route": "rag"}

    prompt = f"""
Classify query:

FACT → user giving personal info
RESUME → asking about resume person
GENERAL → conceptual knowledge

Return ONLY:
FACT / RESUME / GENERAL

Query:
{state['query']}
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    decision = res.choices[0].message.content.strip().upper()
    print("Router:", decision)

    if decision == "GENERAL":
        return {"route": "direct"}

    # Fallback: when classifier uncertain, default to retrieval path
    return {"route": "rag"}

# ---------- FACT DETECTION ----------
def fact_detect(state: AgentState):
    print("🧠 FACT DETECT")

    prompt = f"""
Decide if the user is PROVIDING a first-person fact about themselves.

Return exactly FACT or QUESTION.

Mark QUESTION if:
- asking for information (including about self)
- referring to someone else (he/she/they/his/her/their)
- general definition requests
Examples FACT:
- My CGPA is 9
- I interned at Google
- I studied at IIT Delhi
Examples QUESTION (not fact):
- What is my CGPA
- What is his CGPA
- Explain CGPA

Query:
{state['query']}
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    decision = res.choices[0].message.content.strip().upper()

    return {"is_fact": decision == "FACT"}


def extract_structured_fact(statement: str):
    """Use LLM to filter and structure user-provided facts."""
    prompt = f"""
You are a fact filter.

Keep ONLY first-person factual statements about the user. Reject questions and statements about others.

Allowed categories:
- personal_data (name, contact, demographic)
- experience (jobs, projects, internships)
- education (schools, degrees, grades like CGPA)
- numeric_fact (scores, counts, metrics)

If the statement is NOT an allowed fact, respond with REJECT.

If it is allowed, respond ONLY with compact JSON:
{{"category": "<category>", "fact": "<concise fact>", "subject": "user"}}

Statement:
{statement}
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    content = res.choices[0].message.content.strip()

    if content.upper().startswith("REJECT"):
        return None

    try:
        data = json.loads(content)
        if data.get("subject") != "user":
            return None
        if data.get("category") not in {"personal_data", "experience", "education", "numeric_fact"}:
            return None
        return data
    except Exception:
        return None
def subject_tracker(state):
    global last_subject

    q_raw = state["query"]
    q = q_raw.lower()

    # First-person → user
    if re.search(r"\b(i|me|my|mine)\b", q):
        last_subject = "user"
        return {"subject": "user"}

    # Explicit resume mentions
    if re.search(r"\b(anshu|resume)\b", q):
        last_subject = "resume"
        return {"subject": "resume"}

    # Third-person pronouns rely on conversation memory; prefer resume if unclear
    if re.search(r"\b(he|him|his|she|her|hers|they|them|their|theirs)\b", q):
        fallback = last_subject if last_subject != "user" else "resume"
        return {"subject": fallback}

    # Definition-style questions without subjects → general
    if re.search(r"\bwhat is\b|\bdefine\b|\bexplain\b", q):
        return {"subject": "general"}

    # Fallback to last known subject, default resume for routing
    return {"subject": last_subject or "general"}
# ---------- STORE FACT ----------
def store_fact(state: AgentState):
    print("💾 STORE FACT")
    fact_payload = extract_structured_fact(state["query"])

    if not fact_payload:
        return {"answer": "Noted. (No storable personal fact detected.)"}

    fact_text = json.dumps(fact_payload)
    semantic_memory.add(fact_text, metadata={"category": fact_payload["category"]})
    conv_memory.add(state["query"], "Noted.")

    return {"answer": "Got it. I will remember that."}

# ---------- DIRECT ----------
def direct_answer(state: AgentState):
    print("⚡ DIRECT LLM")

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": state["query"]}]
    )

    return {"answer": res.choices[0].message.content}

# ---------- MEMORY SEARCH ----------
def memory_search(state: AgentState):
    print("🧠 MEMORY SEARCH")

    mem_docs = semantic_memory.search(state["query"])

    print("Memory hits:", len(mem_docs))

    return {
        "memory_docs": mem_docs,
        "rewritten_query": state["query"]
    }

# ---------- REWRITE ----------
def rewrite(state: AgentState):
    print("✏️ REWRITE")

    prompt = f"""
Rewrite query for resume retrieval.

Query:
{state['query']}
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    rq = res.choices[0].message.content.strip()

    print("Rewritten:", rq)

    return {"rewritten_query": rq}

# ---------- RETRIEVE ----------
def retrieve(state: AgentState):
    print("🔎 RETRIEVE")

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

    print("Retrieved:", len(final_docs))

    return {"docs": final_docs}

# ---------- RERANK ----------
def rerank_docs(state: AgentState):
    print("📊 RERANK")

    if not state["docs"]:
        return {"docs": []}

    try:
        top = rerank(state["rewritten_query"], state["docs"])
        print("Reranked:", len(top))
        return {"docs": top}
    except:
        return {"docs": state["docs"]}

# ---------- GENERATE ----------
def generate(state: AgentState):
    print("🧠 GENERATE")

    all_docs = state.get("memory_docs", []) + state.get("docs", [])

    if not all_docs:
        return {"answer": "Not found in resume or memory."}

    answer = generate_answer(
        state["rewritten_query"],
        all_docs,
        conv_memory.get_context()
    )

    conv_memory.add(state["query"], answer)

    return {"answer": answer}

# ---------- GRAPH ----------
workflow = StateGraph(AgentState)

workflow.add_node("decide", decide)
workflow.add_node("fact", fact_detect)
workflow.add_node("store", store_fact)
workflow.add_node("direct", direct_answer)
workflow.add_node("rewrite", rewrite)
workflow.add_node("memory", memory_search)
workflow.add_node("retrieve", retrieve)
workflow.add_node("rerank", rerank_docs)
workflow.add_node("generate", generate)

workflow.set_entry_point("subject")
workflow.add_node("subject", subject_tracker)
workflow.add_edge("subject", "decide")

workflow.add_conditional_edges(
    "decide",
    lambda s: s["route"],
    {
        "direct": "direct",
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
    lambda s: "generate" if s["memory_docs"] or s.get("subject") == "user" else "retrieve",
    {
        "generate": "generate",
        "retrieve": "retrieve"
    }
)

workflow.add_edge("retrieve", "rerank")
workflow.add_edge("rerank", "generate")

workflow.add_edge("direct", END)
workflow.add_edge("generate", END)

app = workflow.compile()

# ---------- RUN ----------
def run_agent():
    while True:
        q = input("\nAsk: ")
        if q == "exit":
            break
        app.invoke({"query": q})

if __name__ == "__main__":
    run_agent()
