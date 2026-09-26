from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.deuda_personal import DeudaPersonal
from app.models.usuario import Usuario
from app.schemas.deuda import DeudaCreate, DeudaOut, DeudaUpdate

router = APIRouter(prefix="/deudas", tags=["deudas"])


def _get_deuda(db: Session, deuda_id: int, user: Usuario) -> DeudaPersonal:
    deuda = db.get(DeudaPersonal, deuda_id)
    if deuda is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deuda no encontrada"
        )
    if deuda.usuario_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a esta deuda",
        )
    return deuda


@router.get("", response_model=list[DeudaOut])
def list_deudas(
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DeudaPersonal]:
    return (
        db.query(DeudaPersonal)
        .filter(DeudaPersonal.usuario_id == user.id)
        .order_by(DeudaPersonal.fecha_vencimiento.asc(), DeudaPersonal.id.asc())
        .all()
    )


@router.post(
    "",
    response_model=DeudaOut,
    status_code=status.HTTP_201_CREATED,
)
def create_deuda(
    payload: DeudaCreate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeudaPersonal:
    deuda = DeudaPersonal(usuario_id=user.id, **payload.model_dump())
    db.add(deuda)
    db.commit()
    db.refresh(deuda)
    return deuda


@router.put("/{deuda_id}", response_model=DeudaOut)
def update_deuda(
    deuda_id: int,
    payload: DeudaUpdate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeudaPersonal:
    deuda = _get_deuda(db, deuda_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(deuda, field, value)
    db.commit()
    db.refresh(deuda)
    return deuda


@router.delete("/{deuda_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deuda(
    deuda_id: int,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    deuda = _get_deuda(db, deuda_id, user)
    db.delete(deuda)
    db.commit()