# pylint: disable=invalid-name
"""Election.deleted_at

Revision ID: df1334fc5fe9
Revises: 07859b6b370b
Create Date: 2021-03-30 16:54:17.171317+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "df1334fc5fe9"
down_revision = "07859b6b370b"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("election", sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade():  # pragma: no cover
    pass
    # ### commands auto generated by Alembic - please adjust! ###
    # op.drop_column("election", "deleted_at")
    # ### end Alembic commands ###
