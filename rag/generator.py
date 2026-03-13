from openai import OpenAI
from config import LLM_MODEL

client = OpenAI()


def generate_answer(query, docs=None, memory_context=""):
    docs = docs or []

    # Build RAG context
    context = ""
    for i, d in enumerate(docs):
        context += f"\nSOURCE {i+1}:\n{d.page_content}\n"

    # If no docs → direct mode
    if not context.strip():
        system_instruction = "You are a helpful general AI assistant."
    else:
        system_instruction = """
You are a retrieval-augmented AI assistant.

RULES:
- Answer ONLY from provided sources
- If answer not present → say: Not found
- Be concise and structured
"""

    prompt = f"""
Conversation so far:
{memory_context}

Context:
{context}

Question:
{query}
"""

    stream = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt},
        ],
        stream=True
    )

    full_response = ""

    print("\n🤖 Answer:\n")

    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            token = delta.content
            full_response += token
            print(token, end="", flush=True)

    print("\n")

    return full_response