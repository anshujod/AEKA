from retriever import get_retriever
from reranker import rerank
from generator import generate_answer
from memory import ConversationMemory

retriever = get_retriever()
memory = ConversationMemory()

def run_rag():
    while True:
        query = input("\nAsk a question (or 'exit'): ")

        if query.lower() == "exit":
            break

        docs = retriever.invoke(query)
        top_docs = rerank(query, docs)

        memory_context = memory.get_context()

        answer = generate_answer(query, top_docs, memory_context)

        memory.add(query, answer)

        print("\n🤖 Answer:\n")
        print(answer)

if __name__ == "__main__":
    run_rag()