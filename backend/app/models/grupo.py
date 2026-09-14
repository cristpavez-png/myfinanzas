from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Grupo(Base):
    __tablename__ = "grupo"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    propietario_id: Mapped[int] = mapped_column(
        ForeignKey("usuario.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    miembros: Mapped[list["GrupoMiembro"]] = relationship(
        back_populates="grupo", cascade="all, delete-orphan"
    )
    deudas_hogar: Mapped[list["DeudaHogar"]] = relationship(
        back_populates="grupo", cascade="all, delete-orphan"
    )