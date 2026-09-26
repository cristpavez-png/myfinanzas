from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, model_validator

from app.schemas.deuda_hogar import DeudaHogarOut


class GrupoCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    ingreso_mensual: float | None = Field(default=None, gt=0)


class GrupoUpdate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)


class MiembroOut(BaseModel):
    id: int
    grupo_id: int
    usuario_id: int | None
    email: EmailStr | None = None
    nombre: str | None
    ingreso_mensual: float
    es_propietario: bool
    created_at: datetime


class GrupoResumen(BaseModel):
    id: int
    nombre: str
    propietario_id: int
    es_propietario: bool
    n_miembros: int
    total_pendiente: float
    created_at: datetime


class GrupoOut(BaseModel):
    id: int
    nombre: str
    propietario_id: int
    created_at: datetime
    updated_at: datetime
    miembros: list[MiembroOut] = []
    deudas_hogar: list[DeudaHogarOut] = []


class MiembroAsociar(BaseModel):
    usuario_id: int | None = None
    email: EmailStr | None = None
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    ingreso_mensual: float | None = Field(default=None, gt=0)

    @model_validator(mode="after")
    def _validar_unicidad(self) -> "MiembroAsociar":
        registrado = self.usuario_id is not None or self.email is not None
        manual = self.nombre is not None

        if registrado and self.usuario_id is not None and self.email is not None:
            raise ValueError("Indica usuario_id o email, no ambos")
        if registrado == manual:
            raise ValueError(
                "Indica un usuario (usuario_id o email) o una persona manual (nombre)"
            )
        if manual and self.ingreso_mensual is None:
            raise ValueError("Ingreso mensual requerido para personas manuales")
        return self


class MiembroUpdate(BaseModel):
    ingreso_mensual: float = Field(gt=0)


class AporteMiembro(BaseModel):
    miembro_id: int
    nombre: str
    ingreso_mensual: float
    porcentaje: float
    aporte: float


class DistribucionDeuda(BaseModel):
    deuda_id: int
    descripcion: str
    monto_total: float
    aportes: list[AporteMiembro]


class TotalMiembro(BaseModel):
    miembro_id: int
    nombre: str
    ingreso_mensual: float
    porcentaje: float
    total: float


class DistribucionOut(BaseModel):
    grupo_id: int
    total_deudas: float
    miembros: list[TotalMiembro]
    por_deuda: list[DistribucionDeuda]