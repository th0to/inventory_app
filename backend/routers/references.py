from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import Category, Client, Entity, Location, User
from schemas import CategoryRead, ClientRead, EntityRead, LocationRead, OwnerRead

router = APIRouter(prefix="/api/references", tags=["references"])


@router.get("/categories", response_model=list[CategoryRead])
def list_categories(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Category]:
    return db.scalars(select(Category).order_by(Category.name.asc())).all()


@router.get("/entities", response_model=list[EntityRead])
def list_entities(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Entity]:
    return db.scalars(select(Entity).order_by(Entity.name.asc())).all()


@router.get("/locations", response_model=list[LocationRead])
def list_locations(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Location]:
    return db.scalars(select(Location).order_by(Location.name.asc())).all()


@router.get("/clients", response_model=list[ClientRead])
def list_clients(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Client]:
    return db.scalars(select(Client).order_by(Client.name.asc())).all()


@router.get("/owners", response_model=list[OwnerRead])
def list_owners(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[User]:
    return db.scalars(
        select(User).where(User.is_active.is_(True)).order_by(User.username.asc())
    ).all()
