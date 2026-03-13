from openai import OpenAI
from config import LLM_MODEL

client = OpenAI()
def generate_answer(query, docs, memory_context=""):
    context = ""
    for i, d in enumerate(docs):
        context += f"\nSOURCE {i+1}:\n{d.page_content}\n"

    prompt = f"""
You are a conversational AI assistant.

Conversation so far:
{memory_context}

Answer ONLY from sources.

If not found → say Not found.

Context:
{context}

Question:
{query}
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