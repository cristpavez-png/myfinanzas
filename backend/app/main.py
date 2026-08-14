from fastapi import FastAPI
from app.api.routes.health import router as health_router

app = FastAPI(
    title="MyFinanzas API",
    description="Backend API for MyFinanzas",
    version="0.1.0",
)

app.include_router(health_router)
