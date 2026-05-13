from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from dependencies import get_current_user, get_db, require_admin
from models import Category, Client, Device, DeviceHistory, Entity, Location, User
from schemas import DeviceCreate, DeviceRead, DeviceUpdate

router = APIRouter(prefix="/api/devices", tags=["devices"])


def _device_query():
    return select(Device).options(
        joinedload(Device.category),
        joinedload(Device.entity),
        joinedload(Device.location),
        joinedload(Device.owner),
        joinedload(Device.client),
    )


def _fetch_device(db: Session, device_id: int) -> Device | None:
    return db.scalars(_device_query().where(Device.id == device_id)).first()


def _to_history_value(value: object | None) -> str | None:
    if value is None:
        return None
    return str(value)


def _create_history_entry(
    *,
    db: Session,
    device_id: int,
    user_id: int,
    field_changed: str,
    old_value: object | None,
    new_value: object | None,
) -> None:
    db.add(
        DeviceHistory(
            device_id=device_id,
            user_id=user_id,
            field_changed=field_changed,
            old_value=_to_history_value(old_value),
            new_value=_to_history_value(new_value),
        )
    )


def _assert_exists(db: Session, model, record_id: int, error_message: str) -> None:
    if db.get(model, record_id) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message,
        )


def _validate_relations(
    db: Session, payload: dict[str, Any], *, is_update: bool
) -> None:
    if not is_update or "category_id" in payload:
        category_id = payload.get("category_id")
        if category_id is not None:
            _assert_exists(db, Category, category_id, "Catégorie introuvable")

    if not is_update or "entity_id" in payload:
        entity_id = payload.get("entity_id")
        if entity_id is not None:
            _assert_exists(db, Entity, entity_id, "Entité introuvable")

    if not is_update or "location_id" in payload:
        location_id = payload.get("location_id")
        if location_id is not None:
            _assert_exists(db, Location, location_id, "Lieu introuvable")

    if not is_update or "owner_id" in payload:
        owner_id = payload.get("owner_id")
        if owner_id is not None:
            _assert_exists(db, User, owner_id, "Propriétaire introuvable")

    if "client_id" in payload and payload["client_id"] is not None:
        _assert_exists(db, Client, payload["client_id"], "Client introuvable")


@router.get("", response_model=list[DeviceRead])
def list_devices(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DeviceRead]:
    devices = db.scalars(_device_query().order_by(Device.id.asc())).all()
    return [DeviceRead.from_device(device) for device in devices]


@router.get("/{device_id}", response_model=DeviceRead)
def get_device(
    device_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DeviceRead:
    device = _fetch_device(db, device_id)
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appareil introuvable",
        )
    return DeviceRead.from_device(device)


@router.post("", response_model=DeviceRead, status_code=status.HTTP_201_CREATED)
def create_device(
    payload: DeviceCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DeviceRead:
    data = payload.model_dump()
    _validate_relations(db, data, is_update=False)

    device = Device(**data, created_by=current_user.id, updated_by=current_user.id)
    db.add(device)
    db.flush()

    _create_history_entry(
        db=db,
        device_id=device.id,
        user_id=current_user.id,
        field_changed="create",
        old_value=None,
        new_value="Création de l'appareil",
    )

    db.commit()

    created_device = _fetch_device(db, device.id)
    if created_device is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la création de l'appareil",
        )
    return DeviceRead.from_device(created_device)


@router.put("/{device_id}", response_model=DeviceRead)
def update_device(
    device_id: int,
    payload: DeviceUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DeviceRead:
    device = _fetch_device(db, device_id)
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appareil introuvable",
        )

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun champ à mettre à jour",
        )

    _validate_relations(db, update_data, is_update=True)

    has_changes = False
    for field_name, new_value in update_data.items():
        old_value = getattr(device, field_name)
        if old_value == new_value:
            continue

        setattr(device, field_name, new_value)
        _create_history_entry(
            db=db,
            device_id=device.id,
            user_id=current_user.id,
            field_changed=field_name,
            old_value=old_value,
            new_value=new_value,
        )
        has_changes = True

    if not has_changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Aucun changement détecté",
        )

    device.updated_by = current_user.id
    db.commit()

    updated_device = _fetch_device(db, device.id)
    if updated_device is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la mise à jour de l'appareil",
        )
    return DeviceRead.from_device(updated_device)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Response:
    device = db.get(Device, device_id)
    if device is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appareil introuvable",
        )

    db.delete(device)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
