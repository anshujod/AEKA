from langgraph.graph import StateGraph, END
from memory import ConversationMemory, SemanticMemory
from typing import TypedDict
from openai import OpenAI

from retriever import get_retriever
from reranker import rerank
from generator import generate_answer

conv_memory = ConversationMemory()
semantic_memory = SemanticMemory()
# ---------- STATE ----------
class AgentState(TypedDict):
    query: str
    rewritten_query: str
    docs: list
    answer: str
    route: str

# ---------- INIT ----------
client = OpenAI()
retriever = get_retriever()

# ---------- DECISION NODE ----------
def decide(state: AgentState):
    print("🧭 LLM ROUTER STEP")

    memory_context = conv_memory.get_context()

    router_prompt = f"""
You are an intelligent routing agent.

Decide whether the question requires:

RAG → if answer likely exists in user's personal resume or uploaded documents
DIRECT → if general knowledge, math, reasoning, coding, or world knowledge

Use conversation context.

Return ONLY one word:
RAG or DIRECT

Conversation:
{memory_context}

Query:
{state['query']}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": router_prompt}]
    )

    decision = response.choices[0].message.content.strip().lower()

    if "direct" in decision:
        print("🧭 ROUTE → DIRECT LLM")
        return {"route": "direct"}

    print("🧭 ROUTE → RAG PIPELINE")
    return {"route": "rag"}

# ---------- DIRECT ANSWER ----------
def direct_answer(state: AgentState):
    print("⚡ DIRECT ANSWER STEP")

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": state["query"]}]
    )

    return {"answer": response.choices[0].message.content}

# ---------- QUERY REWRITE ----------
def rewrite(state: AgentState):
    print("✏️ REWRITE STEP")

    memory_context = conv_memory.get_context()

    prompt = f"""
You are a query rewriting AI for a RAG system.

Your job:
Rewrite the question so it is clear and complete for document retrieval.

Rules:
- DO NOT add placeholders
- DO NOT invent information
- Use conversation context if needed
- Keep meaning EXACTLY same
- If already clear → return same query
- Output ONLY rewritten question

Conversation:
{memory_context}

User Question:
{state['query']}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}]
    )

    rewritten = response.choices[0].message.content.strip()

    print("Rewritten Query:", rewritten)

    return {"rewritten_query": rewritten}

# ---------- RETRIEVE ----------
def retrieve(state: AgentState):
    print("🔎 RETRIEVAL STEP")

    docs = retriever.invoke(state["rewritten_query"])
    return {"docs": docs}

# ---------- RERANK ----------
def rerank_docs(state: AgentState):
    print("📊 RERANK STEP")

    top_docs = rerank(state["rewritten_query"], state["docs"])
    return {"docs": top_docs}

# ---------- GENERATE ----------
def generate(state: AgentState):
    print("🧠 GENERATE STEP")

    if not state["docs"]:
        print("⚠️ No docs found → fallback to LLM")

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": state["query"]}]
        )

        answer = response.choices[0].message.content
        return {"answer": answer}

    memory_context = conv_memory.get_context()

    answer = generate_answer(
        state["rewritten_query"],
        state["docs"],
        memory_context
    )

    conv_memory.add(state["query"], answer)

    return {"answer": answer}

# ---------- GRAPH ----------
workflow = StateGraph(AgentState)

workflow.add_node("decide", decide)
workflow.add_node("direct", direct_answer)
workflow.add_node("rewrite", rewrite)
workflow.add_node("retrieve", retrieve)
workflow.add_node("rerank", rerank_docs)
workflow.add_node("generate", generate)

workflow.set_entry_point("decide")

workflow.add_conditional_edges(
    "decide",
    lambda state: state["route"],
    {
        "direct": "direct",
        "rag": "rewrite"
    }
)

workflow.add_edge("rewrite", "retrieve")
workflow.add_edge("retrieve", "rerank")
workflow.add_edge("rerank", "generate")

workflow.add_edge("direct", END)
workflow.add_edge("generate", END)

app = workflow.compile()

# ---------- RUN ----------
def run_agent():
    while True:
        query = input("\nAsk (or 'exit'): ")

        if query.lower() == "exit":
            break

        result = app.invoke({"query": query})

if __name__ == "__main__":
    run_agent()