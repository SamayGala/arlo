# pylint: disable=invalid-name
"""Delete AuditBoard without cascading

Revision ID: 4aa612e28c2e
Revises: 3efe804f6952
Create Date: 2021-01-04 22:08:21.241785+00:00

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = "4aa612e28c2e"
down_revision = "3efe804f6952"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("batch_audit_board_id_fkey", "batch", type_="foreignkey")
    op.create_foreign_key(
        op.f("batch_audit_board_id_fkey"),
        "batch",
        "audit_board",
        ["audit_board_id"],
        ["id"],
        ondelete="set null",
    )
    op.drop_constraint(
        "sampled_ballot_audit_board_id_fkey", "sampled_ballot", type_="foreignkey"
    )
    op.create_foreign_key(
        op.f("sampled_ballot_audit_board_id_fkey"),
        "sampled_ballot",
        "audit_board",
        ["audit_board_id"],
        ["id"],
        ondelete="set null",
    )


def downgrade():  # pragma: no cover
    pass
    # ### commands auto generated by Alembic - please adjust! ###
    # op.drop_constraint(
    #     op.f("sampled_ballot_audit_board_id_fkey"), "sampled_ballot", type_="foreignkey"
    # )
    # op.create_foreign_key(
    #     "sampled_ballot_audit_board_id_fkey",
    #     "sampled_ballot",
    #     "audit_board",
    #     ["audit_board_id"],
    #     ["id"],
    #     ondelete="CASCADE",
    # )
    # op.drop_constraint(op.f("batch_audit_board_id_fkey"), "batch", type_="foreignkey")
    # op.create_foreign_key(
    #     "batch_audit_board_id_fkey",
    #     "batch",
    #     "audit_board",
    #     ["audit_board_id"],
    #     ["id"],
    #     ondelete="CASCADE",
    # )
    # ### end Alembic commands ###