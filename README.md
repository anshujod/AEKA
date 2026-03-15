# AEKA RAG Agent

Compact RAG playground that indexes a resume PDF, retrieves with a hybrid dense/BM25 retriever, reranks with a cross-encoder, and answers with OpenAI.

## Prerequisites
- Python 3.10+ and `pip`
- OpenAI API key (`export OPENAI_API_KEY=...`)
- Install deps (minimal set):
  ```bash
  pip install langchain-community langchain-openai langchain-huggingface \
    langchain-text-splitters langchain-chroma chromadb sentence-transformers \
    langgraph openai
  ```

## 1) Ingest the resume
`ingest.py` chunks `data/RESUME_ANSHU copy.pdf`, embeds with `all-MiniLM-L6-v2`, and writes a persistent Chroma DB to `chroma_db/`.
```bash
python ingest.py
```
Re-run after changing the PDF.

## 2) Run the agent (guided, with tools + memory)
`rag/agent.py` uses LangGraph with tool routing (calc/date), subject tracking, fact storage, hybrid retrieval → rerank → context filtering, and grounded generation (citations).
```bash
python rag/agent.py
```
- Commands inside the loop: `:debug` to show steps, `:user` to hide, `:exit` to quit.
- Example queries: `Convert 8.2 CGPA to percentage`, `What is this resume about?`

## 3) Run the simple pipeline (baseline RAG)
`rag/pipeline.py` = retrieve → rerank → generate, with short conversation history.
```bash
python rag/pipeline.py
```

## 4) One-off minimal script
`rag.py` is an earlier minimal RAG script: manual multi-query → retrieve → answer once.

## Configuration knobs (`rag/config.py`)
- `EMBEDDING_MODEL`, `RERANKER_MODEL`
- `VECTOR_DB_PATH` (default `chroma_db`)
- `LLM_MODEL` (default `gpt-4o-mini`)
- `TOP_K_RETRIEVAL`, `TOP_K_RERANK`

## Data & memory
- Resume chunks live in the persistent Chroma DB (`chroma_db/`).
- Conversation and user facts are stored in a separate Chroma collection (`agent_memory`) at runtime.

## Notes
- CGPA→percentage tool uses a 9.5 factor for 10-point scales.
- If LangChain warns about deprecated `Chroma`, install `langchain-chroma` (already referenced in code).

## UI (Next.js)
- `resume-ai-ui/` contains a clean Next.js 14 + App Router + TypeScript + Tailwind shell for the chat UI (dark mode by default).
- Install deps and run:
  ```bash
  cd resume-ai-ui
  npm install
  npm run dev
  ```
- Chat page skeleton lives at `src/app/page.tsx`; global layout/styling in `src/app/layout.tsx` and `src/app/globals.css`.
