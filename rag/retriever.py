from typing import List, Dict
from langchain_core.documents import Document
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.retrievers import BM25Retriever
from config import EMBEDDING_MODEL, VECTOR_DB_PATH, TOP_K_RETRIEVAL

DENSE_WEIGHT = 0.6
BM25_WEIGHT = 0.4


class HybridRetriever:
    """Combine dense (Chroma) + BM25 keyword retrieval."""

    def __init__(self, vectorstore: Chroma, bm25: BM25Retriever):
        self.vectorstore = vectorstore
        self.dense = vectorstore.as_retriever(search_kwargs={"k": TOP_K_RETRIEVAL})
        self.bm25 = bm25

    def _score_list(self, docs: List[Document], weight: float) -> Dict[str, float]:
        # Higher rank => higher score; simple reciprocal scaling
        scored = {}
        total = len(docs)
        for idx, d in enumerate(docs):
            key = d.page_content
            base = weight * (total - idx) / max(total, 1)
            scored[key] = max(scored.get(key, 0), base)
        return scored

    def _merge(self, dense_docs: List[Document], bm_docs: List[Document]) -> List[Document]:
        scores = {}
        doc_map = {}

        for doc in dense_docs:
            doc_map[doc.page_content] = doc
        for doc in bm_docs:
            doc_map.setdefault(doc.page_content, doc)

        # accumulate scores
        for k, v in self._score_list(dense_docs, DENSE_WEIGHT).items():
            scores[k] = scores.get(k, 0) + v
        for k, v in self._score_list(bm_docs, BM25_WEIGHT).items():
            scores[k] = scores.get(k, 0) + v

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_keys = [k for k, _ in ranked[:TOP_K_RETRIEVAL]]
        return [doc_map[k] for k in top_keys]

    def invoke(self, query: str) -> List[Document]:
        dense_docs = self.dense.invoke(query)
        # BM25 retriever in newer langchain exposes `invoke`/`__call__`
        bm_docs = self.bm25.invoke(query)
        return self._merge(dense_docs, bm_docs)


def _load_bm25_docs(vectorstore: Chroma) -> List[Document]:
    """Load raw documents from Chroma for BM25 keyword retrieval."""
    store = vectorstore.get(include=["documents", "metadatas"])
    docs = []
    for text, meta in zip(store.get("documents", []), store.get("metadatas", [])):
        docs.append(Document(page_content=text, metadata=meta or {}))
    return docs


def get_retriever():
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    vectorstore = Chroma(
        persist_directory=VECTOR_DB_PATH,
        embedding_function=embeddings
    )

    bm25_docs = _load_bm25_docs(vectorstore)
    bm25 = BM25Retriever.from_documents(bm25_docs) if bm25_docs else BM25Retriever([])

    return HybridRetriever(vectorstore, bm25)
