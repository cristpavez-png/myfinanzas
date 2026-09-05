"""esquema inicial: usuario y deuda_personal

Revision ID: 0001
Revises:
Create Date: 2026-09-04

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "usuario",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "ingreso_mensual", sa.Numeric(precision=12, scale=2), nullable=True
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_usuario_email", "usuario", ["email"], unique=True)

    op.create_table(
        "deuda_personal",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=False),
        sa.Column("descripcion", sa.String(length=255), nullable=False),
        sa.Column("categoria", sa.String(length=50), nullable=False),
        sa.Column(
            "monto_total", sa.Numeric(precision=12, scale=2), nullable=False
        ),
        sa.Column("num_cuotas", sa.Integer(), nullable=True),
        sa.Column("fecha_vencimiento", sa.Date(), nullable=False),
        sa.Column(
            "estado",
            sa.String(length=20),
            server_default=sa.text("'pendiente'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["usuario_id"], ["usuario.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index(
        "ix_deuda_personal_usuario_id",
        "deuda_personal",
        ["usuario_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_deuda_personal_usuario_id", table_name="deuda_personal")
    op.drop_table("deuda_personal")
    op.drop_index("ix_usuario_email", table_name="usuario")
    op.drop_table("usuario")