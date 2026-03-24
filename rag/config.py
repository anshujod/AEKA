import os

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
VECTOR_DB_PATH = "chroma_db"
DOCUMENTS_PATH = os.getenv("DOCUMENTS_PATH", "data")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()

DEFAULT_MODELS = {
    "groq": "llama-3.1-8b-instant",
    "openai": "gpt-4o-mini",
}

DEFAULT_BASE_URLS = {
    "groq": "https://api.groq.com/openai/v1",
    "openai": None,
}

LLM_MODEL = os.getenv("LLM_MODEL", DEFAULT_MODELS.get(LLM_PROVIDER, "llama-3.1-8b-instant"))
LLM_BASE_URL = os.getenv("LLM_BASE_URL", DEFAULT_BASE_URLS.get(LLM_PROVIDER) or "")
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv(
    "GROQ_API_KEY" if LLM_PROVIDER == "groq" else "OPENAI_API_KEY"
)
STRICT_DOC_ONLY = os.getenv("STRICT_DOC_ONLY", "true").lower() == "true"

TOP_K_RETRIEVAL = 8
TOP_K_RERANK = 6
