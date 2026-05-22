from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings


class DocumentChunker:
    def __init__(self) -> None:
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.RAG_CHUNK_SIZE,
            chunk_overlap=settings.RAG_CHUNK_OVERLAP,
            separators=["\n## ", "\n### ", "\n\n", "\n", ". ", " ", ""],
        )

    def chunk_text(self, *, text: str, metadata: dict) -> list[Document]:
        source_document = Document(page_content=text, metadata=metadata)
        return self.splitter.split_documents([source_document])
