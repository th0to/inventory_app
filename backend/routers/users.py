from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from dependencies import get_db, require_admin
from models import User
from schemas import UserCreate, UserRead, UserUpdate
from security import hash_password

router = APIRouter(prefix="/api/users", tags=["users"])


def _ensure_unique(db: Session, *, username: str | None, email: str | None,
                   exclude_id: int | None = None) -> None:
    """Refuse un username/email déjà pris par un autre utilisateur."""
    if username is not None:
        clash = db.scalars(select(User).where(User.username == username)).first()
        if clash and clash.id != exclude_id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ce nom d'utilisateur est déjà utilisé")
    if email is not None:
        clash = db.scalars(select(User).where(User.email == email)).first()
        if clash and clash.id != exclude_id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Cet email est déjà utilisé")


@router.get("", response_model=list[UserRead])
def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[User]:
    return db.scalars(select(User).order_by(User.username.asc())).all()


@router.post("", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> User:
    _ensure_unique(db, username=payload.username, email=payload.email)
    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")

    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Aucun champ à mettre à jour")

    # Garde-fou : un admin ne peut pas se désactiver ni se rétrograder lui-même.
    if user_id == current_user.id:
        if data.get("is_active") is False:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas désactiver votre propre compte")
        if "role" in data and data["role"] != current_user.role:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas changer votre propre rôle")

    _ensure_unique(db, username=data.get("username"), email=data.get("email"), exclude_id=user_id)

    if "password" in data:
        password = data.pop("password")
        if password:  # mot de passe non vide => réinitialisation
            user.password_hash = hash_password(password)
    for field_name, value in data.items():
        setattr(user, field_name, value)

    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Response:
    """Désactivation logique (is_active=False).

    Une suppression dure est volontairement écartée : les FK devices.owner_id /
    created_by / updated_by et device_history.user_id (sans ON DELETE) la
    feraient échouer pour tout utilisateur déjà référencé. La réactivation se
    fait via PUT (is_active=true).
    """
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Utilisateur introuvable")
    if user_id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vous ne pouvez pas supprimer votre propre compte")

    user.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
