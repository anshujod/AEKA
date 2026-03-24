from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from pathlib import Path
import sys

RAG_DIR = Path(__file__).parent / "rag"
sys.path.insert(0, str(RAG_DIR))

from config import EMBEDDING_MODEL, VECTOR_DB_PATH
from llm import chat_completion

# 🔹 embedding model
embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL
)

# 🔹 vector DB
vectorstore = Chroma(
    persist_directory=VECTOR_DB_PATH,
    embedding_function=embeddings
)

retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

query = input("Ask a question: ")

multi_query_prompt = f"""
Generate 3 different search queries for:
{query}
"""

mq = chat_completion(messages=[{"role": "user", "content": multi_query_prompt}])

queries = mq.choices[0].message.content.split("\n")

docs = []
for q in queries:
    docs.extend(retriever.invoke(q))

# remove duplicates
unique_docs = list({d.page_content: d for d in docs}.values())

context = ""
for i, d in enumerate(unique_docs):
    context += f"\nSOURCE {i+1}:\n{d.page_content}\n"

final_prompt = f"""
Answer ONLY from sources.

If not found → say Not found.

Context:
{context}

Question:
{query}
"""

response = chat_completion(messages=[{"role": "user", "content": final_prompt}])

print("\n🤖 Answer:\n")
print(response.choices[0].message.content)
