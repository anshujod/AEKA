# AEKA RAG Agent

Compact RAG playground that indexes one or more local documents, retrieves with a hybrid dense/BM25 retriever, reranks with a cross-encoder, and answers with a configurable LLM provider. The default setup now uses Groq.

## Prerequisites
- Python 3.10+ and `pip`
- Groq API key (`export GROQ_API_KEY=...`)
- Install deps (minimal set):
  ```bash
  pip install langchain-community langchain-huggingface \
    langchain-text-splitters langchain-chroma chromadb sentence-transformers \
    langgraph openai fastapi uvicorn
  ```

## 1) Ingest documents
`ingest.py` indexes a file or a whole folder, embeds with `all-MiniLM-L6-v2`, and writes a persistent Chroma DB to `chroma_db/`.

Supported file types:
- `.pdf`
- `.txt`
- `.md`
- `.csv`
- `.json`
- `.html`
- `.docx`

Ingest the default `data/` folder:
```bash
python ingest.py
```

Or ingest a specific file/folder:
```bash
python ingest.py data/my-paper.pdf
python ingest.py data/
```

Re-run after changing your source documents.

## 2) Run the agent (guided, with tools + memory)
`rag/agent.py` uses LangGraph with tool routing (calc/date), light conversational memory, hybrid retrieval → rerank → context filtering, and grounded generation (citations).
```bash
python rag/agent.py
```
- Commands inside the loop: `:debug` to show steps, `:user` to hide, `:exit` to quit.
- Example queries: `Summarize this document`, `What does the paper say about the method?`, `Convert 8.2 CGPA to percentage`

## 3) Run the simple pipeline (baseline RAG)
`rag/pipeline.py` = retrieve → rerank → generate, with short conversation history.
```bash
python rag/pipeline.py
```

## 4) One-off minimal script
`rag.py` is an earlier minimal RAG script: manual multi-query → retrieve → answer once.

## Configuration knobs (`rag/config.py`)
- `DOCUMENTS_PATH` (default `data`)
- `CHUNK_SIZE`, `CHUNK_OVERLAP`
- `EMBEDDING_MODEL`, `RERANKER_MODEL`
- `VECTOR_DB_PATH` (default `chroma_db`)
- `LLM_PROVIDER` (default `groq`)
- `LLM_MODEL` (default `llama-3.1-8b-instant`)
- `LLM_BASE_URL` (default `https://api.groq.com/openai/v1`)
- `TOP_K_RETRIEVAL`, `TOP_K_RERANK`

## Data & memory
- Document chunks live in the persistent Chroma DB (`chroma_db/`).
- Conversation and lightweight memory facts are stored in a separate Chroma collection (`agent_memory`) at runtime.

## Notes
- CGPA→percentage tool uses a 9.5 factor for 10-point scales.
- The repo uses the OpenAI-compatible Python SDK against Groq by default, so no GPT model is required.
- If LangChain warns about deprecated `Chroma`, install `langchain-chroma` (already referenced in code).

## UI (Next.js)
- `resume-ai-ui/` contains a Next.js 14 + App Router + TypeScript + Tailwind shell for the chat UI.
- Install deps and run:
  ```bash
  cd resume-ai-ui
  npm install
  npm run dev
  ```
- Chat page skeleton lives at `src/app/page.tsx`; global layout/styling in `src/app/layout.tsx` and `src/app/globals.css`.
