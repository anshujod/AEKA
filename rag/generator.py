from llm import chat_completion

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
- If you can partially answer, give the best concise answer with citations; only say "Not found" if no relevant info exists in the chunks.
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

    res = chat_completion(messages=[{"role": "user", "content": prompt}], stream=False)

    return res.choices[0].message.content.strip()
