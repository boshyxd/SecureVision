"""add_risk_score_and_pattern_type

Revision ID: bbe39c372d66
Revises: 
Create Date: 2025-01-18 21:49:29.723281

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = 'bbe39c372d66'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Get existing columns
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_columns = {col['name'] for col in inspector.get_columns('breach_entries')}

    # Add columns if they don't exist
    if 'risk_score' not in existing_columns:
        op.add_column('breach_entries', sa.Column('risk_score', sa.Float(), nullable=True))
    if 'pattern_type' not in existing_columns:
        op.add_column('breach_entries', sa.Column('pattern_type', sa.String(length=50), nullable=True))

def downgrade() -> None:
    # Get existing columns
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_columns = {col['name'] for col in inspector.get_columns('breach_entries')}

    # Remove columns if they exist
    if 'pattern_type' in existing_columns:
        op.drop_column('breach_entries', 'pattern_type')
    if 'risk_score' in existing_columns:
        op.drop_column('breach_entries', 'risk_score')
