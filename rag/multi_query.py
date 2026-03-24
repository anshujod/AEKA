from llm import chat_completion

def generate_multi_queries(query):
    prompt = f"""
Generate 3 different search queries for retrieving resume information.

Original Query:
{query}

Return each query on new line.
"""

    response = chat_completion(messages=[{"role": "user", "content": prompt}])

    queries = response.choices[0].message.content.split("\n")
    return [q.strip() for q in queries if q.strip()]
