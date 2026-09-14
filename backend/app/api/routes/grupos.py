from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import DeudaHogar, Grupo, GrupoMiembro
from app.models.usuario import Usuario
from app.schemas.deuda_hogar import DeudaHogarCreate, DeudaHogarOut, DeudaHogarUpdate
from app.schemas.grupo import (
    AporteMiembro,
    DistribucionDeuda,
    DistribucionOut,
    GrupoCreate,
    GrupoOut,
    GrupoResumen,
    GrupoUpdate,
    MiembroAsociar,
    MiembroOut,
    MiembroUpdate,
    TotalMiembro,
)
from app.services.distribucion import DistribucionError, repartir_deuda

router = APIRouter(prefix="/grupos", tags=["grupos"])


def _nombre_miembro(miembro: GrupoMiembro) -> str:
    if miembro.usuario is not None:
        return miembro.usuario.nombre
    return miembro.nombre or ""


def _miembro_out(miembro: GrupoMiembro) -> MiembroOut:
    return MiembroOut(
        id=miembro.id,
        grupo_id=miembro.grupo_id,
        usuario_id=miembro.usuario_id,
        email=miembro.usuario.email if miembro.usuario is not None else None,
        nombre=_nombre_miembro(miembro),
        ingreso_mensual=miembro.ingreso_mensual,
        es_propietario=miembro.es_propietario,
        created_at=miembro.created_at,
    )


def _es_miembro(db: Session, grupo_id: int, usuario_id: int) -> bool:
    return (
        db.query(GrupoMiembro.id)
        .filter(
            GrupoMiembro.grupo_id == grupo_id,
            GrupoMiembro.usuario_id == usuario_id,
        )
        .first()
        is not None
    )


def _get_grupo(db: Session, grupo_id: int, user: Usuario) -> Grupo:
    grupo = db.get(Grupo, grupo_id)
    if grupo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Grupo no encontrado"
        )
    if not _es_miembro(db, grupo.id, user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No eres miembro de este grupo",
        )
    return grupo


def _get_grupo_propietario(db: Session, grupo_id: int, user: Usuario) -> Grupo:
    grupo = _get_grupo(db, grupo_id, user)
    if grupo.propietario_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el propietario del grupo puede realizar esta acción",
        )
    return grupo


def _get_deuda_hogar(
    db: Session, grupo: Grupo, deuda_id: int, user: Usuario
) -> DeudaHogar:
    deuda = db.get(DeudaHogar, deuda_id)
    if deuda is None or deuda.grupo_id != grupo.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Deuda no encontrada"
        )
    if grupo.propietario_id != user.id and deuda.creada_por != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para modificar esta deuda",
        )
    return deuda


def _grupo_out(db: Session, grupo: Grupo) -> GrupoOut:
    miembros = (
        db.query(GrupoMiembro)
        .filter(GrupoMiembro.grupo_id == grupo.id)
        .order_by(GrupoMiembro.id.asc())
        .all()
    )
    deudas = (
        db.query(DeudaHogar)
        .filter(DeudaHogar.grupo_id == grupo.id)
        .order_by(DeudaHogar.fecha_vencimiento.asc(), DeudaHogar.id.asc())
        .all()
    )
    return GrupoOut(
        id=grupo.id,
        nombre=grupo.nombre,
        propietario_id=grupo.propietario_id,
        created_at=grupo.created_at,
        updated_at=grupo.updated_at,
        miembros=[_miembro_out(m) for m in miembros],
        deudas_hogar=[DeudaHogarOut.model_validate(d) for d in deudas],
    )


@router.post("", response_model=GrupoOut, status_code=status.HTTP_201_CREATED)
def crear_grupo(
    payload: GrupoCreate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GrupoOut:
    ingreso = payload.ingreso_mensual if payload.ingreso_mensual is not None else user.ingreso_mensual
    if ingreso is None or ingreso <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Debes declarar tu ingreso mensual para crear un grupo",
        )

    grupo = Grupo(nombre=payload.nombre.strip(), propietario_id=user.id)
    db.add(grupo)
    db.flush()
    db.add(
        GrupoMiembro(
            grupo_id=grupo.id,
            usuario_id=user.id,
            ingreso_mensual=ingreso,
            es_propietario=True,
        )
    )
    db.commit()
    db.refresh(grupo)
    return _grupo_out(db, grupo)


@router.get("", response_model=list[GrupoResumen])
def listar_grupos(
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[GrupoResumen]:
    grupos = (
        db.query(Grupo)
        .join(GrupoMiembro, GrupoMiembro.grupo_id == Grupo.id)
        .filter(GrupoMiembro.usuario_id == user.id)
        .order_by(Grupo.id.desc())
        .all()
    )

    resumenes: list[GrupoResumen] = []
    for grupo in grupos:
        n_miembros = (
            db.query(func.count(GrupoMiembro.id))
            .filter(GrupoMiembro.grupo_id == grupo.id)
            .scalar()
        )
        total_pendiente = (
            db.query(func.coalesce(func.sum(DeudaHogar.monto_total), 0))
            .filter(
                DeudaHogar.grupo_id == grupo.id,
                DeudaHogar.estado == "pendiente",
            )
            .scalar()
        )
        resumenes.append(
            GrupoResumen(
                id=grupo.id,
                nombre=grupo.nombre,
                propietario_id=grupo.propietario_id,
                es_propietario=grupo.propietario_id == user.id,
                n_miembros=n_miembros or 0,
                total_pendiente=float(total_pendiente or 0),
                created_at=grupo.created_at,
            )
        )
    return resumenes


@router.get("/{grupo_id}", response_model=GrupoOut)
def detalle_grupo(
    grupo_id: int,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GrupoOut:
    grupo = _get_grupo(db, grupo_id, user)
    return _grupo_out(db, grupo)


@router.put("/{grupo_id}", response_model=GrupoOut)
def renombrar_grupo(
    grupo_id: int,
    payload: GrupoUpdate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> GrupoOut:
    grupo = _get_grupo_propietario(db, grupo_id, user)
    grupo.nombre = payload.nombre.strip()
    db.commit()
    db.refresh(grupo)
    return _grupo_out(db, grupo)


@router.delete("/{grupo_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_grupo(
    grupo_id: int,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    grupo = _get_grupo_propietario(db, grupo_id, user)
    db.delete(grupo)
    db.commit()


@router.post(
    "/{grupo_id}/miembros",
    response_model=MiembroOut,
    status_code=status.HTTP_201_CREATED,
)
def agregar_miembro(
    grupo_id: int,
    payload: MiembroAsociar,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MiembroOut:
    grupo = _get_grupo_propietario(db, grupo_id, user)

    if payload.nombre is not None:
        duplicado = (
            db.query(GrupoMiembro)
            .filter(
                GrupoMiembro.grupo_id == grupo.id,
                GrupoMiembro.nombre == payload.nombre.strip(),
            )
            .first()
        )
        if duplicado is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ya existe una persona con ese nombre en el grupo",
            )
        miembro = GrupoMiembro(
            grupo_id=grupo.id,
            nombre=payload.nombre.strip(),
            ingreso_mensual=payload.ingreso_mensual,  # type: ignore[arg-type]
            es_propietario=False,
        )
    else:
        if payload.usuario_id is not None:
            target = db.get(Usuario, payload.usuario_id)
        else:
            target = (
                db.query(Usuario)
                .filter(Usuario.email == (payload.email or "").lower())
                .first()
            )
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
            )

        duplicado = (
            db.query(GrupoMiembro)
            .filter(
                GrupoMiembro.grupo_id == grupo.id,
                GrupoMiembro.usuario_id == target.id,
            )
            .first()
        )
        if duplicado is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El usuario ya es miembro del grupo",
            )

        ingreso = (
            payload.ingreso_mensual
            if payload.ingreso_mensual is not None
            else target.ingreso_mensual
        )
        if ingreso is None or ingreso <= 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="El usuario debe declarar un ingreso mensual para unirse",
            )
        miembro = GrupoMiembro(
            grupo_id=grupo.id,
            usuario_id=target.id,
            ingreso_mensual=ingreso,
        )

    db.add(miembro)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El miembro ya existe en el grupo",
        )
    db.refresh(miembro)
    return _miembro_out(miembro)


@router.put("/{grupo_id}/miembros/{miembro_id}", response_model=MiembroOut)
def actualizar_miembro(
    grupo_id: int,
    miembro_id: int,
    payload: MiembroUpdate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MiembroOut:
    grupo = _get_grupo(db, grupo_id, user)
    miembro = db.get(GrupoMiembro, miembro_id)
    if miembro is None or miembro.grupo_id != grupo.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Miembro no encontrado"
        )
    if grupo.propietario_id != user.id and miembro.usuario_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para editar este miembro",
        )

    miembro.ingreso_mensual = payload.ingreso_mensual
    db.commit()
    db.refresh(miembro)
    return _miembro_out(miembro)


@router.delete("/{grupo_id}/miembros/{miembro_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_miembro(
    grupo_id: int,
    miembro_id: int,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    grupo = _get_grupo_propietario(db, grupo_id, user)
    miembro = db.get(GrupoMiembro, miembro_id)
    if miembro is None or miembro.grupo_id != grupo.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Miembro no encontrado"
        )
    if miembro.es_propietario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El propietario no puede salir del grupo; elimina el grupo",
        )
    db.delete(miembro)
    db.commit()


@router.get("/{grupo_id}/deudas", response_model=list[DeudaHogarOut])
def listar_deudas_hogar(
    grupo_id: int,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DeudaHogar]:
    grupo = _get_grupo(db, grupo_id, user)
    return (
        db.query(DeudaHogar)
        .filter(DeudaHogar.grupo_id == grupo.id)
        .order_by(DeudaHogar.fecha_vencimiento.asc(), DeudaHogar.id.asc())
        .all()
    )


@router.post(
    "/{grupo_id}/deudas",
    response_model=DeudaHogarOut,
    status_code=status.HTTP_201_CREATED,
)
def crear_deuda_hogar(
    grupo_id: int,
    payload: DeudaHogarCreate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeudaHogar:
    grupo = _get_grupo(db, grupo_id, user)
    deuda = DeudaHogar(grupo_id=grupo.id, creada_por=user.id, **payload.model_dump())
    db.add(deuda)
    db.commit()
    db.refresh(deuda)
    return deuda


@router.put("/{grupo_id}/deudas/{deuda_id}", response_model=DeudaHogarOut)
def actualizar_deuda_hogar(
    grupo_id: int,
    deuda_id: int,
    payload: DeudaHogarUpdate,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeudaHogar:
    grupo = _get_grupo(db, grupo_id, user)
    deuda = _get_deuda_hogar(db, grupo, deuda_id, user)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(deuda, field, value)
    db.commit()
    db.refresh(deuda)
    return deuda


@router.delete("/{grupo_id}/deudas/{deuda_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_deuda_hogar(
    grupo_id: int,
    deuda_id: int,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    grupo = _get_grupo(db, grupo_id, user)
    deuda = _get_deuda_hogar(db, grupo, deuda_id, user)
    db.delete(deuda)
    db.commit()


@router.get("/{grupo_id}/distribucion", response_model=DistribucionOut)
def distribucion_grupo(
    grupo_id: int,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DistribucionOut:
    grupo = _get_grupo(db, grupo_id, user)

    miembros = (
        db.query(GrupoMiembro)
        .filter(GrupoMiembro.grupo_id == grupo.id)
        .order_by(GrupoMiembro.id.asc())
        .all()
    )
    if not miembros or sum(m.ingreso_mensual for m in miembros) <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Todos los miembros deben declarar un ingreso mensual",
        )

    deudas_pendientes = (
        db.query(DeudaHogar)
        .filter(
            DeudaHogar.grupo_id == grupo.id,
            DeudaHogar.estado == "pendiente",
        )
        .order_by(DeudaHogar.fecha_vencimiento.asc(), DeudaHogar.id.asc())
        .all()
    )

    total_deudas = float(sum(d.monto_total for d in deudas_pendientes))
    totales: dict[int, dict] = {
        m.id: {
            "miembro_id": m.id,
            "nombre": _nombre_miembro(m),
            "ingreso_mensual": m.ingreso_mensual,
            "porcentaje": 0.0,
            "total": 0.0,
        }
        for m in miembros
    }

    por_deuda: list[DistribucionDeuda] = []
    for deuda in deudas_pendientes:
        try:
            aportes = repartir_deuda(
                deuda.monto_total,
                [
                    (m.id, _nombre_miembro(m), float(m.ingreso_mensual))
                    for m in miembros
                ],
            )
        except DistribucionError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
            )

        por_deuda.append(
            DistribucionDeuda(
                deuda_id=deuda.id,
                descripcion=deuda.descripcion,
                monto_total=deuda.monto_total,
                aportes=[AporteMiembro(**a) for a in aportes],
            )
        )
        for a in aportes:
            totales[a["miembro_id"]]["total"] += a["aporte"]

    # Porcentaje global por miembro (sobre el total de deudas, no sobre ingresos).
    for t in totales.values():
        if total_deudas > 0:
            t["porcentaje"] = round(t["total"] / total_deudas * 100, 2)

    return DistribucionOut(
        grupo_id=grupo.id,
        total_deudas=total_deudas,
        miembros=[TotalMiembro(**t) for t in totales.values()],
        por_deuda=por_deuda,
    )