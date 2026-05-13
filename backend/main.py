import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import Base, engine
import models  # noqa: F401
from routers.auth import router as auth_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    await asyncio.to_thread(Base.metadata.create_all, bind=engine)
    yield


app = FastAPI(title="Inventory API", lifespan=lifespan)

app.include_router(auth_router)


@app.get("/health", tags=["system"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
