"""add_vector_store

Revision ID: 43c864f546d6
Revises: 965e7f731330
Create Date: 2026-07-19 12:36:25.470862

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '43c864f546d6'
down_revision: Union[str, None] = '965e7f731330'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add embedding backup column to knowledge_edges
    op.add_column('knowledge_edges', sa.Column('embedding', sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column('knowledge_edges', 'embedding')
