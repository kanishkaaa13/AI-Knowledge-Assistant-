import uuid
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    def __init__(self, db: Session) -> None:
        super().__init__(Conversation, db)

    def list_by_user(self, user_id: uuid.UUID) -> list[Conversation]:
        statement = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_user(self, user_id: uuid.UUID, conversation_id: uuid.UUID) -> Conversation | None:
        statement = select(Conversation).where(
            Conversation.user_id == user_id,
            Conversation.id == conversation_id,
        )
        return self.db.scalar(statement)

    def search_by_user(self, user_id: uuid.UUID, query: str | None = None) -> list[Conversation]:
        statement = select(Conversation).where(Conversation.user_id == user_id)
        if query:
            pattern = f"%{query.strip()}%"
            statement = statement.where(
                or_(
                    Conversation.title.ilike(pattern),
                    Conversation.summary.ilike(pattern),
                    Conversation.messages.any(Message.content.ilike(pattern)),
                )
            )

        statement = statement.order_by(Conversation.updated_at.desc())
        return list(self.db.scalars(statement).all())

    def get_message_count(self, conversation_id: uuid.UUID) -> int:
        statement = select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
        return int(self.db.scalar(statement) or 0)

    def count_by_user(self, user_id: uuid.UUID) -> int:
        statement = select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
        return int(self.db.scalar(statement) or 0)

    def conversation_counts_by_day(self, user_id: uuid.UUID, limit: int = 7) -> list[tuple[datetime, int]]:
        statement = (
            select(func.date_trunc("day", Conversation.created_at), func.count(Conversation.id))
            .where(Conversation.user_id == user_id)
            .group_by(func.date_trunc("day", Conversation.created_at))
            .order_by(func.date_trunc("day", Conversation.created_at).desc())
            .limit(limit)
        )
        return [(row[0], int(row[1])) for row in self.db.execute(statement).all()]
