import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import Base, engine
import models  # noqa: F401
from routers.auth import router as auth_router
from routers.devices import router as devices_router
from routers.references import router as references_router
from routers.stats import router as stats_router
from routers.users import router as users_router
from security import validate_jwt_secret_key


@asynccontextmanager
async def lifespan(_: FastAPI):
    validate_jwt_secret_key()
    yield


app = FastAPI(title="Inventory API", lifespan=lifespan)

app.include_router(auth_router)
app.include_router(references_router)
app.include_router(devices_router)
app.include_router(stats_router)
app.include_router(users_router)


@app.get("/health", tags=["system"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
