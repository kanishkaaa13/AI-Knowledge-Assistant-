import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.message import Message
from app.repositories.base import BaseRepository


class MessageRepository(BaseRepository[Message]):
    def __init__(self, db: Session) -> None:
        super().__init__(Message, db)

    def list_by_conversation(self, conversation_id: uuid.UUID) -> list[Message]:
        statement = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.sequence_number.asc(), Message.created_at.asc())
        )
        return list(self.db.scalars(statement).all())
