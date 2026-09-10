from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: EmailStr
    ingreso_mensual: float | None = None
    created_at: datetime


class UsuarioUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    ingreso_mensual: float | None = Field(default=None, ge=0)