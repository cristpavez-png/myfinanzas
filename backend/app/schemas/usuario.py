from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class UsuarioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nombre: str
    email: EmailStr
    ingreso_mensual: float | None = None
    created_at: datetime