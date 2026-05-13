import os
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

_DEFAULT_KEY = "change-me-in-production"
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", _DEFAULT_KEY)
if not JWT_SECRET_KEY or JWT_SECRET_KEY == _DEFAULT_KEY:
    raise ValueError(
        "JWT_SECRET_KEY environment variable must be set to a secure random value "
        "(at least 32 characters). Do not use the default placeholder in production."
    )
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "8"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
