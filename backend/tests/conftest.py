import os

# Debe definirse ANTES de importar app.* (settings se lee una sola vez).
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///./test_myfinanzas.db"
os.environ["AUTH_COOKIE_SECURE"] = "false"

import pytest
from fastapi.testclient import TestClient

from app.core.database import Base, engine
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    with TestClient(app) as c:
        yield c


def _registrar(
    client: TestClient,
    ingreso: float | None = 1000000.0,
    email: str | None = None,
    nombre: str = "Chris Duoc",
) -> str:
    payload = {
        "nombre": nombre,
        "email": email,
        "password": "Secreto123!",
        "ingreso_mensual": ingreso,
    }
    if email is None:
        payload["email"] = f"user_{os.urandom(4).hex()}@test.cl"
    r = client.post("/auth/register", json=payload)
    assert r.status_code == 201, r.text
    return payload["email"]


def _login(client: TestClient, email: str) -> None:
    r = client.post("/auth/login", json={"email": email, "password": "Secreto123!"})
    assert r.status_code == 200, r.text
    assert client.cookies.get("myfinanzas_token") is not None


def crear_usuario_logueado(
    client: TestClient,
    ingreso: float | None = 1000000.0,
    nombre: str = "Chris Duoc",
) -> str:
    email = _registrar(client, ingreso=ingreso, nombre=nombre)
    _login(client, email)
    return email


def crear_grupo(client: TestClient, nombre: str = "Hogar Duoc") -> int:
    r = client.post("/grupos", json={"nombre": nombre})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def crear_deuda_hogar(client: TestClient, grupo_id: int, monto: float = 510000.0) -> dict:
    payload = {
        "descripcion": "Arriendo octubre",
        "categoria": "arriendo",
        "monto_total": monto,
        "num_cuotas": 1,
        "fecha_vencimiento": "2026-10-01",
        "estado": "pendiente",
    }
    r = client.post(f"/grupos/{grupo_id}/deudas", json=payload)
    assert r.status_code == 201, r.text
    return r.json()