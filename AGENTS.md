AGENTS.md — MyFinanzas

Este archivo es la referencia persistente para cualquier agente de IA (Claude Code, Cursor, etc.) que trabaje en este repositorio. Léelo antes de proponer o generar cambios.

Sobre el proyecto

MyFinanzas es una aplicación web fullstack de gestión de gastos y deudas compartidas, desarrollada como proyecto de título de Ingeniería en Informática (DUOC UC). Permite a un usuario autenticarse, gestionar sus deudas personales, y formar un grupo/hogar con otras personas (registradas o creadas manualmente) para distribuir proporcionalmente las deudas del hogar según los ingresos declarados de cada miembro.

Equipo: Chris (responsable / lead fullstack) y Nick (colaborador de desarrollo).

Stack tecnológico
Capa	Tecnología
Frontend	Next.js (TypeScript, App Router) + Ant Design (antd)
Backend	FastAPI (Python)
Base de datos	MySQL
ORM / migraciones	SQLAlchemy + Alembic
Autenticación	JWT + bcrypt
Despliegue	Vercel (frontend) + Railway (backend y MySQL)
Estructura del repositorio (monorepo)
myfinanzas/
├── backend/          # API FastAPI
│   ├── app/
│   │   ├── models/       # modelos SQLAlchemy
│   │   ├── schemas/      # schemas Pydantic
│   │   ├── routers/      # endpoints agrupados por dominio (auth, deudas, grupos...)
│   │   └── services/     # lógica de negocio (ej. motor de cálculo de distribución)
│   ├── alembic/       # migraciones de base de datos
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/         # Next.js + Ant Design
│   ├── app/
│   │   ├── (public)/     # landing, login, register, forgot-password
│   │   └── panel/        # rutas protegidas (post-autenticación)
│   ├── package.json
│   └── ...
├── docs/             # portafolio de título, diagramas (ER, arquitectura, gantt)
├── AGENTS.md
└── README.md
Comandos de desarrollo

Backend:

cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

Frontend:

cd frontend
bun install
bun run dev

Gestor de paquetes: este proyecto usa únicamente bun en /frontend. No uses npm, yarn ni pnpm, y no generes ni commitees package-lock.json, yarn.lock ni pnpm-lock.yaml. Si por error aparece un lockfile de otro gestor, bórralo junto con node_modules y reinstala con bun install. El único lockfile versionado en el repo debe ser bun.lockb o bun.lock.

Convenciones de código

Backend (FastAPI):

Type hints obligatorios en todas las funciones.
Validación de entrada/salida siempre vía schemas Pydantic (nunca exponer modelos SQLAlchemy directamente en las respuestas).
Endpoints agrupados por dominio en routers/ (ej. auth_router.py, deudas_router.py).
Nunca exponer password_hash ni otros campos sensibles en las respuestas.
Migraciones siempre vía Alembic — no modificar el esquema de la base de datos directamente.

Frontend (Next.js + Ant Design):

TypeScript estricto (no usar any salvo justificación explícita en comentario).
UI construida exclusivamente con componentes de Ant Design; no mezclar con otras librerías de componentes ni reconstruir desde cero algo que antd ya resuelve.
Componentes en PascalCase, carpetas de rutas en kebab-case.
Rutas protegidas (/panel/**) deben verificar sesión válida antes de renderizar contenido; redirigir a /login si no hay sesión.

General:

Commits siguiendo Conventional Commits (feat:, fix:, chore:, docs:...).
Ramas: main (estable) → develop (integración) → feature/nombre-tarea.
Todo cambio se integra a develop vía Pull Request con revisión cruzada entre Chris y Nick.
Seguridad
Nunca commitear secretos, credenciales ni archivos .env. Usar .env.example como referencia.
Contraseñas siempre con hash bcrypt en el backend.
Sesión manejada con JWT; evaluar cookie httpOnly antes de usar localStorage en el frontend.
Un usuario nunca debe poder ver ni modificar datos (deudas, perfil) de otro usuario fuera de su grupo — validar esto en cada endpoint protegido, no solo en el frontend.
Testing
Backend: pytest para pruebas de endpoints y lógica de negocio (especialmente el motor de cálculo de distribución del Hito 4).
Frontend: pruebas manuales por sprint como mínimo; se puede incorporar Testing Library si el tiempo lo permite (no es bloqueante para el MVP).
Estado actual del proyecto (hitos)
Hito	Estado
H1 — Requisitos y planificación	Completado
H2 — Diseño (arquitectura, ERD, mockups)	Completado
H3 — Auth + CRUD de deudas (backend)	Completado
H3 — Auth + CRUD de deudas (frontend, Ant Design)	En progreso
H4 — Grupos y motor de distribución	Pendiente
H5 — Integración	Pendiente
H6 — QA	Pendiente
H7 — Documentación/portafolio	Pendiente
H8 — Presentación final	Pendiente
Gestión de dependencias (frontend)
Gestor de paquetes único: bun. Nunca uses npm install, yarn add ni pnpm add.
Si bun install falla por conflicto de peer dependencies, no te quedes esperando confirmación: agrega la dependencia igual y avisa en tu respuesta qué conflicto hubo.
Antes de instalar una librería nueva, revisa que no exista ya package-lock.json, yarn.lock o pnpm-lock.yaml en /frontend. Si existe alguno, bórralo junto con node_modules antes de continuar, y avisa que lo hiciste.
Reglas para agentes de IA
No modificar endpoints del backend ya implementados y probados sin avisar explícitamente qué cambia y por qué.
No implementar funcionalidades de hitos futuros (grupos, personas manuales, solicitudes de amistad, motor de distribución) mientras el hito actual no esté cerrado, salvo pedido explícito.
Si un endpoint que se necesita no existe todavía, indicarlo antes de inventar su contrato — no asumir shapes de datos no confirmados.
Priorizar el alcance del MVP definido en el plan de software (docs/plan_software_myfinanzas.md) por sobre funcionalidades adicionales no solicitadas.
Ante ambigüedad de diseño de UI, resolver con componentes estándar de Ant Design antes que con estilos custom.
