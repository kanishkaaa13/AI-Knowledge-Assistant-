from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from docx import Document as DocxDocument
from pypdf import PdfReader

from app.models.uploaded_document import UploadedDocument


@dataclass
class ParsedDocumentPage:
    page_number: int
    text: str


class StoredDocumentParser:
    def parse(self, document: UploadedDocument) -> list[ParsedDocumentPage]:
        if not document.file_path:
            return []

        path = Path(document.file_path)
        if not path.exists():
            return []

        extension = document.file_extension.lower()
        if extension == ".pdf":
            reader = PdfReader(str(path))
            return [
                ParsedDocumentPage(page_number=index + 1, text=page.extract_text() or "")
                for index, page in enumerate(reader.pages)
            ]

        if extension == ".docx":
            docx = DocxDocument(str(path))
            content = "\n".join(paragraph.text for paragraph in docx.paragraphs)
            return [ParsedDocumentPage(page_number=1, text=content)]

        if extension in {".txt", ".md"}:
            try:
                content = path.read_text(encoding="utf-8")
            except UnicodeDecodeError:
                content = path.read_text(encoding="latin-1")
            return [ParsedDocumentPage(page_number=1, text=content)]

        return []
