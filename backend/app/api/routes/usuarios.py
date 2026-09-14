from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioOut, UsuarioUpdate

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("/me", response_model=UsuarioOut)
def get_me(user: Usuario = Depends(get_current_user)) -> Usuario:
    return user


@router.put("/me", response_model=UsuarioOut)
def update_me(
    payload: UsuarioUpdate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Usuario:
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "nombre" and value is not None:
            value = value.strip()
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
