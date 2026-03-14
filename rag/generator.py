from openai import OpenAI
from config import LLM_MODEL

client = OpenAI()

def format_docs_with_ids(docs):
    context = ""
    for i, d in enumerate(docs):
        context += f"\n[Chunk {i+1}]\n{d.page_content}\n"
    return context

def generate_answer(query, docs, memory_context=""):
    context = format_docs_with_ids(docs)

    prompt = f"""
You are a grounded AI assistant.

IMPORTANT RULES:
- Answer ONLY using provided chunks
- Every factual sentence MUST include citation like [1], [2]
- If answer not found → say "Not found"
- Do NOT use prior knowledge
- Do NOT hallucinate

Conversation:
{memory_context}

Context:
{context}

Question:
{query}

Answer with citations:
"""

    stream = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        stream=True
    )

    full_response = ""

    print("\n🤖 Answer:\n")

    for chunk in stream:
        if chunk.choices[0].delta.content:
            token = chunk.choices[0].delta.content
            full_response += token
            print(token, end="", flush=True)

    print("\n")

    return full_response