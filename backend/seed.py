from __future__ import annotations

import os

from passlib.context import CryptContext
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from models import Category, Entity, Location, User, UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ENTITIES = [
    {"name": "GVA", "has_order_num": False},
    {"name": "Zurich", "has_order_num": True},
    {"name": "CDS", "has_order_num": False},
    {"name": "FIX", "has_order_num": False},
]

CATEGORIES = [
    "Laptop",
    "Desktop",
    "Mobile Workstation",
    "Workstation",
    "Display",
    "Docking",
    "Thin Client",
    "Peripheral",
]

LOCATIONS = [
    "Stock",
    "Showroom",
    "Client",
    "Test",
    "5ème",
    "Smart Locker",
]


def _seed_entities(db: Session) -> None:
    existing = {name for (name,) in db.execute(select(Entity.name)).all()}
    for entity in ENTITIES:
        if entity["name"] not in existing:
            db.add(Entity(name=entity["name"], has_order_num=entity["has_order_num"]))


def _seed_categories(db: Session) -> None:
    existing = {name for (name,) in db.execute(select(Category.name)).all()}
    for name in CATEGORIES:
        if name not in existing:
            db.add(Category(name=name))


def _seed_locations(db: Session) -> None:
    existing = {name for (name,) in db.execute(select(Location.name)).all()}
    for name in LOCATIONS:
        if name not in existing:
            db.add(Location(name=name))


def _seed_default_admin(db: Session) -> None:
    username = os.getenv("ADMIN_USERNAME", "admin")
    email = os.getenv("ADMIN_EMAIL", "admin@local")
    password = os.getenv("ADMIN_PASSWORD")

    admin_user = db.execute(
        select(User).where(or_(User.username == username, User.email == email))
    ).scalar_one_or_none()

    if admin_user is None:
        if not password:
            raise ValueError(
                "ADMIN_PASSWORD doit être définie pour créer l'administrateur par défaut."
            )
        db.add(
            User(
                username=username,
                email=email,
                password_hash=pwd_context.hash(password),
                role=UserRole.ADMIN,
                is_active=True,
            )
        )
        return

    if admin_user.role != UserRole.ADMIN:
        admin_user.role = UserRole.ADMIN
    if not admin_user.is_active:
        admin_user.is_active = True


def seed() -> None:
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        _seed_entities(db)
        _seed_categories(db)
        _seed_locations(db)
        _seed_default_admin(db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed terminée : tables créées et données de référence insérées.")
