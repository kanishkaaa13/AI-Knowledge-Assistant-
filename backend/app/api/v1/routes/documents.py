import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.repositories.document import DocumentRepository
from app.schemas.document import (
    DocumentPreviewRead,
    UploadedDocumentListItem,
    UploadedDocumentRead,
)
from app.services.document_upload import (
    create_document_record,
    delete_document_file,
    parse_upload,
    preview_text,
)

router = APIRouter()


@router.get("", response_model=list[UploadedDocumentListItem])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UploadedDocumentListItem]:
    repository = DocumentRepository(db)
    documents = repository.list_by_user(current_user.id)
    return [
        UploadedDocumentListItem(
            **UploadedDocumentRead.model_validate(document).model_dump(),
            preview_text=preview_text(document.extracted_text),
        )
        for document in documents
    ]


@router.post("/upload", response_model=UploadedDocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UploadedDocumentRead:
    upload_data = await parse_upload(file, current_user.id)
    document = create_document_record(
        db,
        user=current_user,
        title=title.strip() or upload_data.safe_file_name,
        upload_data=upload_data,
    )
    return UploadedDocumentRead.model_validate(document)


@router.get("/{document_id}", response_model=UploadedDocumentRead)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UploadedDocumentRead:
    repository = DocumentRepository(db)
    document = repository.get_by_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return UploadedDocumentRead.model_validate(document)


@router.get("/{document_id}/preview", response_model=DocumentPreviewRead)
async def get_document_preview(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentPreviewRead:
    repository = DocumentRepository(db)
    document = repository.get_by_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    return DocumentPreviewRead(
        id=document.id,
        title=document.title,
        file_name=document.file_name,
        file_extension=document.file_extension,
        mime_type=document.mime_type,
        file_size=document.file_size,
        page_count=document.page_count,
        word_count=document.word_count,
        preview_text=preview_text(document.extracted_text),
    )


@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    repository = DocumentRepository(db)
    document = repository.get_by_user(document_id, current_user.id)
    if not document or not document.file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file not found.")

    return FileResponse(
        path=file_path,
        filename=document.file_name,
        media_type=document.mime_type or "application/octet-stream",
    )


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    repository = DocumentRepository(db)
    document = repository.get_by_user(document_id, current_user.id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    delete_document_file(document)
    repository.delete(document)
    return {"message": "Document deleted successfully."}
