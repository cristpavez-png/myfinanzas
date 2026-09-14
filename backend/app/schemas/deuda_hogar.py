from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.deuda import CategoriaDeuda, EstadoDeuda


class DeudaHogarCreate(BaseModel):
    descripcion: str = Field(min_length=1, max_length=255)
    categoria: CategoriaDeuda
    monto_total: float = Field(gt=0)
    num_cuotas: int | None = Field(default=1, ge=1, le=120)
    fecha_vencimiento: date
    estado: EstadoDeuda = EstadoDeuda.PENDIENTE


class DeudaHogarUpdate(BaseModel):
    descripcion: str | None = Field(default=None, min_length=1, max_length=255)
    categoria: CategoriaDeuda | None = None
    monto_total: float | None = Field(default=None, gt=0)
    num_cuotas: int | None = Field(default=None, ge=1, le=120)
    fecha_vencimiento: date | None = None
    estado: EstadoDeuda | None = None


class DeudaHogarOut(DeudaHogarCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    grupo_id: int
    creada_por: int
    created_at: datetime