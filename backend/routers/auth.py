from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import User
from schemas import LoginCredentials, Token, UserRead
from security import create_access_token, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(credentials: LoginCredentials, db: Session = Depends(get_db)) -> Token:
    """Authentifie un utilisateur et retourne un token JWT."""
    user: User | None = (
        db.query(User).filter(User.username == credentials.username).first()
    )
    if user is None or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identifiants incorrects",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Compte désactivé",
        )
    access_token = create_access_token(user_id=user.id, role=user.role.value)
    return Token(access_token=access_token, token_type="bearer", role=user.role.value)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(_: User = Depends(get_current_user)) -> None:
    """Déconnexion (stateless — invalidation côté client)."""
    return None


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)) -> User:
    """Retourne les informations de l'utilisateur connecté."""
    return current_user
