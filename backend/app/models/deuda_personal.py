from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class DeudaPersonal(Base):
    __tablename__ = "deuda_personal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(
        ForeignKey("usuario.id", ondelete="CASCADE"), index=True, nullable=False
    )
    descripcion: Mapped[str] = mapped_column(String(255), nullable=False)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)
    monto_total: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    num_cuotas: Mapped[int | None] = mapped_column(Integer, nullable=True, default=1)
    fecha_vencimiento: Mapped[date] = mapped_column(Date, nullable=False)
    estado: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pendiente"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    usuario: Mapped["Usuario"] = relationship(back_populates="deudas")