"""Tests du routeur de gestion des comptes (backend/routers/users.py).

Base SQLite jetable ; les dépendances get_db et require_admin sont surchargées
pour injecter une session de test et un admin courant connu.
"""

import os
import sys

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from database import Base  # noqa: E402
from dependencies import get_db, require_admin  # noqa: E402
from models import User, UserRole  # noqa: E402
from security import hash_password  # noqa: E402
from routers.users import router as users_router  # noqa: E402


@pytest.fixture()
def client(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'users.db'}")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestSession()

    admin = User(username="admin", email="admin@inventory.local",
                 password_hash=hash_password("x"), role=UserRole.ADMIN)
    session.add(admin)
    session.commit()

    app = FastAPI()
    app.include_router(users_router)
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[require_admin] = lambda: admin

    c = TestClient(app)
    c.admin = admin  # exposé pour les tests qui vérifient le « soi-même »
    yield c
    session.close()


def test_create_and_list_user(client):
    resp = client.post("/api/users", json={
        "username": "alice", "email": "alice@example.com", "password": "secret123",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert body["username"] == "alice"
    assert body["role"] == "user"
    assert "password_hash" not in body          # jamais exposé

    listed = client.get("/api/users").json()
    usernames = {u["username"] for u in listed}
    assert {"admin", "alice"} <= usernames


def test_create_duplicate_username_conflicts(client):
    client.post("/api/users", json={"username": "bob", "email": "bob@example.com", "password": "p"})
    dup = client.post("/api/users", json={"username": "bob", "email": "other@example.com", "password": "p"})
    assert dup.status_code == 409


def test_update_role_and_password_reset(client):
    uid = client.post("/api/users", json={
        "username": "carol", "email": "carol@example.com", "password": "old",
    }).json()["id"]

    resp = client.put(f"/api/users/{uid}", json={"role": "admin", "password": "newpass"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"

    # le hash a bien changé en base
    from sqlalchemy import select
    session = client.app.dependency_overrides[get_db]()
    user = session.scalars(select(User).where(User.id == uid)).first()
    assert user.password_hash and user.password_hash != "newpass"


def test_soft_delete_deactivates(client):
    uid = client.post("/api/users", json={
        "username": "dave", "email": "dave@example.com", "password": "p",
    }).json()["id"]

    resp = client.delete(f"/api/users/{uid}")
    assert resp.status_code == 204

    user = next(u for u in client.get("/api/users").json() if u["id"] == uid)
    assert user["is_active"] is False

    # réactivation via PUT
    reactivated = client.put(f"/api/users/{uid}", json={"is_active": True})
    assert reactivated.json()["is_active"] is True


def test_admin_cannot_delete_self(client):
    resp = client.delete(f"/api/users/{client.admin.id}")
    assert resp.status_code == 400


def test_admin_cannot_deactivate_self(client):
    resp = client.put(f"/api/users/{client.admin.id}", json={"is_active": False})
    assert resp.status_code == 400


def test_update_missing_user_404(client):
    assert client.put("/api/users/9999", json={"role": "user"}).status_code == 404
