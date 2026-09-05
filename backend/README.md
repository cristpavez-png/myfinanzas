# MyFinanzas — API Backend

API REST (FastAPI) para **MyFinanzas**, una app de gestión de deudas y gastos personales.

Entrega **Hito 3**: MVP de autenticación (registro, login con JWT, recuperación de contraseña) y CRUD de deudas personales.

## Stack

- **Python 3.13** + **FastAPI**
- **SQLAlchemy 2.0** (ORM) + **Alembic** (migraciones)
- **MySQL** vía `PyMySQL` (en desarrollo compatible con SQLite)
- **bcrypt** para hash de contraseñas, **PyJWT** para tokens

## Requisitos

- Python 3.13+
- MySQL 8+ (o SQLite para desarrollo local)

## Puesta en marcha

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows
pip install -r requirements.txt

copy .env.example .env            # personalizar valores
python -m alembic upgrade head    # aplicar migración 0001
uvicorn app.main:app --reload     # http://127.0.0.1:8000
```

Documentación interactiva (Swagger) en `http://127.0.0.1:8000/docs`.

### Variables de entorno (`.env`)

| Variable | Default | Descripción |
|---|---|---|
| `APP_ENV` | `development` | Entorno de ejecución |
| `DATABASE_URL` | `mysql+pymysql://root:password@localhost:3306/myfinanzas` | Conexión a la base de datos |
| `SECRET_KEY` | `change-me-...` | Secreto para firmar JWT (**cambiar en producción**) |
| `ALGORITHM` | `HS256` | Algoritmo de firma JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` | Vida de tokens de acceso (min) |
| `JWT_RESET_TOKEN_EXPIRE_MINUTES` | `60` | Vida de tokens de recuperación (min) |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Orígenes permitidos (JSON en `.env`) |

## Modelo de datos

### `usuario`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | Autoincremental |
| `nombre` | varchar(100) | |
| `email` | varchar(255) UNIQUE | Se guarda en minúsculas |
| `password_hash` | varchar(255) | Hash bcrypt, nunca expuesto |
| `ingreso_mensual` | decimal(12,2) NULL | |
| `created_at` | datetime | |

### `deuda_personal`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | int PK | |
| `usuario_id` | int FK → usuario | `CASCADE` al eliminar |
| `descripcion` | varchar(255) | |
| `categoria` | enum | ver valores más abajo |
| `monto_total` | decimal(12,2) | `> 0` |
| `num_cuotas` | int NULL | `1–120`, default `1` |
| `fecha_vencimiento` | date | |
| `estado` | enum | `pendiente` (default) / `pagada` |
| `created_at` | datetime | |

Categorías: `arriendo`, `servicios`, `tarjeta_credito`, `transporte`, `comida`, `salud`, `educacion`, `otros`.

## Autenticación

- Login devuelve un **JWT** (HS256) con `sub = usuario_id`.
- Los endpoints protegidos requieren el header `Authorization: Bearer <token>`.
- En el frontend (Next.js) el token NO se guarda en `localStorage`: se almacena en una cookie `httpOnly` y las server actions de Next lo reenvían al backend.
- Estados posibles: `401` token ausente/inválido/expirado, `403` deuda de otro usuario, `404` recurso inexistente, `409` email duplicado, `422` validación, `400` token de recuperación inválido.

---

## Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/register` | — | Crear cuenta |
| POST | `/auth/login` | — | Iniciar sesión |
| POST | `/auth/forgot-password` | — | Solicitar recuperación |
| POST | `/auth/reset-password` | — | Cambiar contraseña |
| GET | `/deudas` | Bearer | Listar deudas del usuario |
| POST | `/deudas` | Bearer | Crear deuda |
| PUT | `/deudas/{id}` | Bearer | Actualizar deuda |
| DELETE | `/deudas/{id}` | Bearer | Eliminar deuda |

### POST `/auth/register`

Crea un usuario. El email se normaliza a minúsculas y se valida unicidad.

**Body:**

```json
{
  "nombre": "Ana Pérez",
  "email": "ana@dominio.cl",
  "password": "password123",
  "ingreso_mensual": 1500000.0
}
```

`ingreso_mensual` es opcional.

**Respuesta `201`:**

```json
{
  "id": 1,
  "nombre": "Ana Pérez",
  "email": "ana@dominio.cl",
  "ingreso_mensual": 1500000.0,
  "created_at": "2026-09-05T00:00:00"
}
```

> `password_hash` nunca se devuelve.

**Errores:** `409` email ya registrado `{"detail": "El email ya está registrado"}` · `422` validación.

### POST `/auth/login`

Autentica y devuelve el token de acceso.

**Body:**

```json
{ "email": "ana@dominio.cl", "password": "password123" }
```

**Respuesta `200`:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Errores:** `401` credenciales inválidas (envía header `WWW-Authenticate: Bearer`).

### POST `/auth/forgot-password`

Genera un token de recuperación de 60 min (configurable).

**Body:**

```json
{ "email": "ana@dominio.cl" }
```

**Respuesta `200`:**

```json
{
  "message": "Si el email existe, se generó un enlace de recuperación.",
  "reset_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Siempre responde `200` (aunque el email no exista) para no revelar cuentas existentes.

> **Nota del Hito 3:** no hay servicio de email. En desarrollo el `reset_token` viaja en la respuesta (y se loguea) para poder probar el flujo. En producción debe enviarse por email y NO devolverse en el body.

### POST `/auth/reset-password`

Establece una nueva contraseña con el token recibido.

**Body:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "nuevaClave456"
}
```

**Respuesta `200`:**

```json
{ "message": "Contraseña actualizada correctamente" }
```

**Errores:** `400` token expirado o inválido.

### GET `/deudas`

Lista las deudas del usuario autenticado, ordenadas por `fecha_vencimiento` (asc) y luego `id` (asc).

**Respuesta `200`:**

```json
[
  {
    "id": 1,
    "usuario_id": 1,
    "descripcion": "Arriendo departamento",
    "categoria": "arriendo",
    "monto_total": 450000.5,
    "num_cuotas": 1,
    "fecha_vencimiento": "2026-10-01",
    "estado": "pendiente",
    "created_at": "2026-09-05T00:00:00"
  }
]
```

**Errores:** `401` sin token.

### POST `/deudas`

Crea una deuda para el usuario autenticado.

**Body:**

```json
{
  "descripcion": "Tarjeta Cencosud",
  "categoria": "tarjeta_credito",
  "monto_total": 250000.0,
  "num_cuotas": 6,
  "fecha_vencimiento": "2026-11-15",
  "estado": "pendiente"
}
```

`num_cuotas` (default `1`) y `estado` (default `pendiente`) son opcionales.

**Respuesta `201`:** objeto `DeudaOut` (misma forma que en GET /deudas).

**Errores:** `401` · `422` (p. ej. `monto_total <= 0`, `categoria` inválida, `num_cuotas` fuera de `1–120`, `descripcion` vacía).

### PUT `/deudas/{id}`

Actualiza parcialmente una deuda (solo los campos enviados vía `exclude_unset`).

**Body** (todos los campos opcionales):

```json
{
  "estado": "pagada",
  "monto_total": 240000.0
}
```

**Respuesta `200`:** `DeudaOut` actualizado.

**Errores:** `401` · `403` deuda de otro usuario · `404` no existe · `422` validación.

### DELETE `/deudas/{id}`

Elimina la deuda.

**Respuesta `204`** sin body.

**Errores:** `401` · `403` · `404`.

---

## Estructura del proyecto

```
backend/
├── alembic/            # migraciones (0001_esquema_inicial.py es head)
├── app/
│   ├── main.py         # app FastAPI + CORS + routers
│   ├── api/
│   │   ├── deps.py     # get_current_user (JWT → Usuario)
│   │   └── routes/     # auth.py, deudas.py
│   ├── core/           # config, database, security
│   ├── models/         # usuario.py, deuda_personal.py
│   └── schemas/        # auth.py, usuario.py, deuda.py (Pydantic)
├── requirements.txt
└── .env.example
```

## Notas

- Pruebas E2E del backend se ejecutaron con SQLite por archivo (`test_backend.py`).
- Compatible con SQLite durante desarrollo: `DATABASE_URL=sqlite+pysqlite:///./app.db`.
- La migración `0001` crea tablas con `utf8mb4` y borrado en cascada de deudas al eliminar el usuario.