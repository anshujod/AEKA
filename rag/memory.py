from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
import uuid
from collections import deque
from config import EMBEDDING_MODEL

class ConversationMemory:
    def __init__(self, max_turns=5):
        self.history = deque(maxlen=max_turns)

    def add(self, user, assistant):
        self.history.append((user, assistant))

    def get_context(self):
        context = ""
        for u, a in self.history:
            context += f"User: {u}\nAssistant: {a}\n"
        return context

class SemanticMemory:

    def __init__(self):
        self.vectorstore = Chroma(
            collection_name="agent_memory",
            embedding_function=HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
        )

    def add(self, fact_text, metadata=None):
        doc = Document(
            page_content=fact_text,
            metadata=metadata or {"id": str(uuid.uuid4())}
        )
        self.vectorstore.add_documents([doc])

    def search(self, query, k=3):
        docs = self.vectorstore.similarity_search(query, k=k)
        return docs
