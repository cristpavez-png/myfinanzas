import logging

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import jwt

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.usuario import Usuario
from app.schemas.auth import (
    ForgotPasswordIn,
    LoginIn,
    RegisterIn,
    ResetPasswordIn,
    TokenOut,
)
from app.schemas.usuario import UsuarioOut

logger = logging.getLogger("myfinanzas.auth")

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    # SameSite=Lax alcanza en desarrollo (localhost ignora el puerto al
    # determinar same-site). En producción cross-site se requiere
    # SameSite=None + Secure (AUTH_COOKIE_SECURE=True).
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite="none" if settings.AUTH_COOKIE_SECURE else "lax",
    )


@router.post(
    "/register",
    response_model=UsuarioOut,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: RegisterIn, db: Session = Depends(get_db)) -> Usuario:
    existing = db.query(Usuario).filter(Usuario.email == payload.email.lower()).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado",
        )

    user = Usuario(
        nombre=payload.nombre.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        ingreso_mensual=payload.ingreso_mensual,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado",
        )
    db.refresh(user)
    return user


@router.post("/login", response_model=TokenOut)
def login(
    payload: LoginIn,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenOut:
    user = db.query(Usuario).filter(Usuario.email == payload.email.lower()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=str(user.id))
    _set_auth_cookie(response, token)
    return TokenOut(access_token=token)


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(key=settings.AUTH_COOKIE_NAME, path="/")
    return {"message": "Sesión cerrada correctamente"}


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordIn, db: Session = Depends(get_db)) -> dict:
    user = db.query(Usuario).filter(Usuario.email == payload.email.lower()).first()

    # No se revela si el email existe para evitar enumeración de cuentas.
    message = {
        "message": "Si el email existe, se generó un enlace de recuperación."
    }

    if user is None:
        return message

    token = create_access_token(
        subject=str(user.id),
        expires_minutes=settings.JWT_RESET_TOKEN_EXPIRE_MINUTES,
    )

    # Hito 3: no hay servicio de email aún. En desarrollo se devuelve el token
    # en la respuesta para poder probar el flujo. En producción debe enviarse
    # por email y NO incluirse en el body de la respuesta.
    logger.info("Reset token para %s: %s", user.email, token)
    return {**message, "reset_token": token}


@router.post("/reset-password")
def reset_password(payload: ResetPasswordIn, db: Session = Depends(get_db)) -> dict:
    try:
        data = decode_token(payload.token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación ha expirado",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación es inválido",
        )

    user = db.get(Usuario, int(data["sub"]))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El enlace de recuperación es inválido",
        )

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"message": "Contraseña actualizada correctamente"}