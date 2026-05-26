import os
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

_DEFAULT_KEYS = {
    "change-me-in-production",
    "change-me-with-a-random-32-characters-minimum",
}
JWT_SECRET_KEY = ""
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def validate_jwt_secret_key() -> None:
    global JWT_SECRET_KEY

    candidate = (os.getenv("JWT_SECRET_KEY") or "").strip()
    if not candidate:
        raise RuntimeError(
            "JWT_SECRET_KEY est obligatoire et ne peut pas être vide. "
            "Générez une clé forte avec: openssl rand -hex 32"
        )
    if candidate in _DEFAULT_KEYS:
        raise RuntimeError(
            "JWT_SECRET_KEY utilise une valeur d'exemple non sécurisée. "
            "Remplacez-la par une clé forte générée aléatoirement."
        )
    if len(candidate) < 32:
        raise RuntimeError(
            "JWT_SECRET_KEY doit contenir au moins 32 caractères."
        )

    JWT_SECRET_KEY = candidate


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(tz=timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT token.

    Raises:
        jwt.ExpiredSignatureError: If the token has expired.
        jwt.InvalidTokenError: If the token is invalid or the signature does not match.
    """
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
