from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class GrupoMiembro(Base):
    __tablename__ = "grupo_miembro"
    __table_args__ = (
        UniqueConstraint("grupo_id", "usuario_id", name="uq_grupo_miembro_usuario"),
        UniqueConstraint("grupo_id", "nombre", name="uq_grupo_miembro_nombre"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    grupo_id: Mapped[int] = mapped_column(
        ForeignKey("grupo.id", ondelete="CASCADE"), index=True, nullable=False
    )
    usuario_id: Mapped[int | None] = mapped_column(
        ForeignKey("usuario.id", ondelete="CASCADE"), nullable=True
    )
    nombre: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ingreso_mensual: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    es_propietario: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    grupo: Mapped["Grupo"] = relationship(back_populates="miembros")
    usuario: Mapped["Usuario | None"] = relationship()