import argparse
from pathlib import Path
import shutil
import sys

from langchain_community.document_loaders import CSVLoader, Docx2txtLoader, PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

RAG_DIR = Path(__file__).parent / "rag"
sys.path.insert(0, str(RAG_DIR))

from config import CHUNK_OVERLAP, CHUNK_SIZE, DOCUMENTS_PATH, EMBEDDING_MODEL, VECTOR_DB_PATH

SUPPORTED_EXTENSIONS = {
    ".pdf",
    ".txt",
    ".md",
    ".markdown",
    ".csv",
    ".json",
    ".html",
    ".htm",
    ".docx",
}


def iter_document_paths(target: Path):
    if target.is_file():
        if target.suffix.lower() not in SUPPORTED_EXTENSIONS:
            raise ValueError(f"Unsupported file type: {target.suffix}")
        return [target]

    if not target.exists():
        raise FileNotFoundError(f"Path does not exist: {target}")

    paths = [
        path for path in target.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    ]
    if not paths:
        raise FileNotFoundError(
            f"No supported documents found under {target}. "
            f"Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )
    return sorted(paths)


def load_file(path: Path):
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        loader = PyPDFLoader(str(path))
    elif suffix == ".csv":
        loader = CSVLoader(str(path))
    elif suffix == ".docx":
        loader = Docx2txtLoader(str(path))
    else:
        loader = TextLoader(str(path), autodetect_encoding=True)

    docs = loader.load()
    for doc in docs:
        metadata = doc.metadata or {}
        metadata["source"] = str(path)
        metadata["file_name"] = path.name
        metadata["file_type"] = suffix.lstrip(".")
        doc.metadata = metadata
    return docs


def load_documents(target: Path):
    documents = []
    for path in iter_document_paths(target):
        documents.extend(load_file(path))
    return documents


def parse_args():
    parser = argparse.ArgumentParser(description="Ingest documents into the Chroma vector store.")
    parser.add_argument(
        "path",
        nargs="?",
        default=DOCUMENTS_PATH,
        help="File or directory to ingest. Defaults to DOCUMENTS_PATH or ./data."
    )
    parser.add_argument(
        "--append",
        action="store_true",
        help="Append to the existing vector store instead of replacing it."
    )
    return parser.parse_args()


def reset_vector_db():
    db_path = Path(VECTOR_DB_PATH)
    if db_path.exists():
        shutil.rmtree(db_path)


args = parse_args()
target_path = Path(args.path).expanduser()
documents = load_documents(target_path)

if not args.append:
    reset_vector_db()

# Split text
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP
)

docs = text_splitter.split_documents(documents)

# Embeddings
embeddings = HuggingFaceEmbeddings(
    model_name=EMBEDDING_MODEL
)

# Store in Chroma
vectorstore = Chroma.from_documents(
    docs,
    embedding=embeddings,
    persist_directory=VECTOR_DB_PATH
)

vectorstore.persist()

mode = "appended to" if args.append else "replaced"
print(f"✅ Ingestion complete: {len(documents)} source document(s), {len(docs)} chunks {mode} {VECTOR_DB_PATH}")
