"""phase 5 document uploads"""

from alembic import op
import sqlalchemy as sa


revision = "20260522_000002"
down_revision = "20260522_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("uploaded_documents", sa.Column("file_extension", sa.String(length=16), nullable=True))
    op.add_column("uploaded_documents", sa.Column("checksum", sa.String(length=64), nullable=True))
    op.add_column("uploaded_documents", sa.Column("page_count", sa.Integer(), nullable=True))
    op.add_column("uploaded_documents", sa.Column("word_count", sa.Integer(), nullable=True))
    op.execute(
        "UPDATE uploaded_documents "
        "SET file_extension = COALESCE(NULLIF(lower(substring(file_name from '\\.[^.]+$')), ''), '.txt') "
        "WHERE file_extension IS NULL"
    )
    op.execute(
        "UPDATE uploaded_documents "
        "SET checksum = md5(id::text) || md5(file_name) "
        "WHERE checksum IS NULL"
    )
    op.alter_column("uploaded_documents", "file_extension", nullable=False)
    op.alter_column("uploaded_documents", "checksum", nullable=False)
    op.create_index(op.f("ix_uploaded_documents_checksum"), "uploaded_documents", ["checksum"], unique=False)
    op.create_index(op.f("ix_uploaded_documents_file_extension"), "uploaded_documents", ["file_extension"], unique=False)
    op.create_unique_constraint(
        "uq_uploaded_documents_user_checksum",
        "uploaded_documents",
        ["user_id", "checksum"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_uploaded_documents_user_checksum", "uploaded_documents", type_="unique")
    op.drop_index(op.f("ix_uploaded_documents_file_extension"), table_name="uploaded_documents")
    op.drop_index(op.f("ix_uploaded_documents_checksum"), table_name="uploaded_documents")
    op.drop_column("uploaded_documents", "word_count")
    op.drop_column("uploaded_documents", "page_count")
    op.drop_column("uploaded_documents", "checksum")
    op.drop_column("uploaded_documents", "file_extension")
