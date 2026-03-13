from langgraph.graph import StateGraph, END
from typing import TypedDict
from retriever import get_retriever
from reranker import rerank
from generator import generate_answer

class AgentState(TypedDict):
    query: str
    docs: list
    answer: str

retriever = get_retriever()

def retrieve(state: AgentState):
    print("🔎 RETRIEVAL STEP")
    docs = retriever.invoke(state["query"])
    return {"docs": docs}

def rerank_docs(state: AgentState):
    print("📊 RERANK STEP")
    top_docs = rerank(state["query"], state["docs"])
    return {"docs": top_docs}

def generate(state: AgentState):
    print("🧠 GENERATE STEP")
    answer = generate_answer(state["query"], state["docs"])
    return {"answer": answer}

workflow = StateGraph(AgentState)

workflow.add_node("retrieve", retrieve)
workflow.add_node("rerank", rerank_docs)
workflow.add_node("generate", generate)

workflow.set_entry_point("retrieve")

workflow.add_edge("retrieve", "rerank")
workflow.add_edge("rerank", "generate")
workflow.add_edge("generate", END)

app = workflow.compile()

def run_agent():
    query = input("Ask: ")
    result = app.invoke({"query": query})
    print("\n🤖", result["answer"])

if __name__ == "__main__":
    run_agent()