from fastapi import FastAPI

from database import Base, engine
import models  # noqa: F401

app = FastAPI(title="Inventory API")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health", tags=["system"])
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
