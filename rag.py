from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from openai import OpenAI

# 🔹 embedding model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# 🔹 vector DB
vectorstore = Chroma(
    persist_directory="chroma_db",
    embedding_function=embeddings
)

retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

query = input("Ask a question: ")

# 🔹 manual multi query generation
client = OpenAI()

multi_query_prompt = f"""
Generate 3 different search queries for:
{query}
"""

mq = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": multi_query_prompt}]
)

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

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": final_prompt}]
)

print("\n🤖 Answer:\n")
print(response.choices[0].message.content)