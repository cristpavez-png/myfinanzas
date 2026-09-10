from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
import jwt

from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_token
from app.models.usuario import Usuario

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # La sesión web viaja en cookie httpOnly; se acepta Bearer como fallback
    # para pruebas y clientes de API.
    token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if token is None and credentials is not None:
        token = credentials.credentials

    if token is None:
        raise unauthorized

    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise unauthorized

    subject = payload.get("sub")
    if subject is None:
        raise unauthorized

    user = db.get(Usuario, int(subject))
    if user is None:
        raise unauthorized

    return user