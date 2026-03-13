from sentence_transformers import CrossEncoder
from config import RERANKER_MODEL, TOP_K_RERANK

reranker = CrossEncoder(RERANKER_MODEL)

def rerank(query, docs):
    pairs = [[query, d.page_content] for d in docs]
    scores = reranker.predict(pairs)

    scored_docs = list(zip(scores, docs))
    scored_docs.sort(key=lambda x: x[0], reverse=True)

    return [d for _, d in scored_docs[:TOP_K_RERANK]]