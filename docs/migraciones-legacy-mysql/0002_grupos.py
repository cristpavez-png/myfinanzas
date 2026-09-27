"""grupos: hogares, miembros y deudas del hogar

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-14

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | None = None
depends_on: str | None = None


def upgrade() -> None:
    op.create_table(
        "grupo",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nombre", sa.String(length=100), nullable=False),
        sa.Column("propietario_id", sa.Integer(), nullable=False),
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
        sa.ForeignKeyConstraint(
            ["propietario_id"], ["usuario.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_grupo_propietario_id", "grupo", ["propietario_id"], unique=False)

    op.create_table(
        "grupo_miembro",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("grupo_id", sa.Integer(), nullable=False),
        sa.Column("usuario_id", sa.Integer(), nullable=True),
        sa.Column("nombre", sa.String(length=100), nullable=True),
        sa.Column("ingreso_mensual", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("es_propietario", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["grupo_id"], ["grupo.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["usuario_id"], ["usuario.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("grupo_id", "usuario_id", name="uq_grupo_miembro_usuario"),
        sa.UniqueConstraint("grupo_id", "nombre", name="uq_grupo_miembro_nombre"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_grupo_miembro_grupo_id", "grupo_miembro", ["grupo_id"], unique=False)

    op.create_table(
        "deuda_hogar",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("grupo_id", sa.Integer(), nullable=False),
        sa.Column("creada_por", sa.Integer(), nullable=False),
        sa.Column("descripcion", sa.String(length=255), nullable=False),
        sa.Column("categoria", sa.String(length=50), nullable=False),
        sa.Column("monto_total", sa.Numeric(precision=12, scale=2), nullable=False),
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
        sa.ForeignKeyConstraint(["grupo_id"], ["grupo.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["creada_por"], ["usuario.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("ix_deuda_hogar_grupo_id", "deuda_hogar", ["grupo_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_deuda_hogar_grupo_id", table_name="deuda_hogar")
    op.drop_table("deuda_hogar")
    op.drop_index("ix_grupo_miembro_grupo_id", table_name="grupo_miembro")
    op.drop_table("grupo_miembro")
    op.drop_index("ix_grupo_propietario_id", table_name="grupo")
    op.drop_table("grupo")