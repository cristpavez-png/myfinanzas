from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class CategoriaDeuda(str, Enum):
    ARRIENDO = "arriendo"
    SERVICIOS = "servicios"
    TARJETA_CREDITO = "tarjeta_credito"
    TRANSPORTE = "transporte"
    COMIDA = "comida"
    SALUD = "salud"
    EDUCACION = "educacion"
    OTROS = "otros"


class EstadoDeuda(str, Enum):
    PENDIENTE = "pendiente"
    PAGADA = "pagada"


class DeudaBase(BaseModel):
    descripcion: str = Field(min_length=1, max_length=255)
    categoria: CategoriaDeuda
    monto_total: float = Field(gt=0)
    num_cuotas: int | None = Field(default=1, ge=1, le=120)
    fecha_vencimiento: date
    estado: EstadoDeuda = EstadoDeuda.PENDIENTE


class DeudaCreate(DeudaBase):
    pass


class DeudaUpdate(BaseModel):
    descripcion: str | None = Field(default=None, min_length=1, max_length=255)
    categoria: CategoriaDeuda | None = None
    monto_total: float | None = Field(default=None, gt=0)
    num_cuotas: int | None = Field(default=None, ge=1, le=120)
    fecha_vencimiento: date | None = None
    estado: EstadoDeuda | None = None


class DeudaOut(DeudaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    usuario_id: int
    created_at: datetime