"""add breach status fields

Revision ID: add_breach_status_fields
Revises: bbe39c372d66
Create Date: 2024-03-19 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision = 'add_breach_status_fields'
down_revision = 'bbe39c372d66'
branch_labels = None
depends_on = None

def upgrade():
    # Get existing columns
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_columns = {col['name'] for col in inspector.get_columns('breach_entries')}

    # Add breach status fields if they don't exist
    new_columns = {
        'had_breach': sa.Column('had_breach', sa.Integer(), nullable=True, default=0),
        'breach_count': sa.Column('breach_count', sa.Integer(), nullable=True, default=0),
        'total_pwned': sa.Column('total_pwned', sa.BigInteger(), nullable=True, default=0),
        'latest_breach': sa.Column('latest_breach', sa.DateTime(), nullable=True),
        'data_classes': sa.Column('data_classes', sa.JSON(), nullable=True),
        'breach_details': sa.Column('breach_details', sa.JSON(), nullable=True)
    }

    for col_name, column in new_columns.items():
        if col_name not in existing_columns:
            op.add_column('breach_entries', column)

def downgrade():
    # Get existing columns
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_columns = {col['name'] for col in inspector.get_columns('breach_entries')}

    # Remove breach status fields if they exist
    columns_to_drop = [
        'had_breach',
        'breach_count',
        'total_pwned',
        'latest_breach',
        'data_classes',
        'breach_details'
    ]

    for col_name in columns_to_drop:
        if col_name in existing_columns:
            op.drop_column('breach_entries', col_name) 