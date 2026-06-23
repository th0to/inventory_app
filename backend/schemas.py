from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr

from models import UserRole


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------


class CategoryRead(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Entity
# ---------------------------------------------------------------------------


class EntityRead(BaseModel):
    id: int
    name: str
    has_order_num: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------


class LocationRead(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------


class ClientCreate(BaseModel):
    name: str
    contact: Optional[str] = None
    sent_date: Optional[datetime] = None


class ClientRead(BaseModel):
    id: int
    name: str
    contact: Optional[str] = None
    sent_date: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.USER


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OwnerRead(BaseModel):
    id: int
    username: str

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


# ---------------------------------------------------------------------------
# Device
# ---------------------------------------------------------------------------


class DeviceCreate(BaseModel):
    serial_number: str
    model_name: str
    generation: Optional[str] = None
    category_id: int
    entity_id: int
    order_number: Optional[str] = None
    location_id: int
    owner_id: int
    client_id: Optional[int] = None
    is_pv: bool = False
    cpu: Optional[str] = None
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    screen_size: Optional[str] = None
    power_w: Optional[int] = None
    comment: Optional[str] = None


class DeviceUpdate(BaseModel):
    serial_number: Optional[str] = None
    model_name: Optional[str] = None
    generation: Optional[str] = None
    category_id: Optional[int] = None
    entity_id: Optional[int] = None
    order_number: Optional[str] = None
    location_id: Optional[int] = None
    client_id: Optional[int] = None
    owner_id: Optional[int] = None
    is_pv: Optional[bool] = None
    cpu: Optional[str] = None
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    screen_size: Optional[str] = None
    power_w: Optional[int] = None
    comment: Optional[str] = None
    is_archived: Optional[bool] = None


class DeviceRead(BaseModel):
    id: int
    serial_number: str
    model_name: str
    generation: Optional[str] = None
    category_id: int
    category: str
    entity_id: int
    entity: str
    order_number: Optional[str] = None
    location_id: int
    location: str
    owner_id: int
    owner: str
    client_id: Optional[int] = None
    client: Optional[str] = None
    is_pv: bool
    cpu: Optional[str] = None
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    screen_size: Optional[str] = None
    power_w: Optional[int] = None
    comment: Optional[str] = None
    is_archived: bool
    created_by: int
    updated_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_device(cls, device) -> "DeviceRead":
        return cls(
            id=device.id,
            serial_number=device.serial_number,
            model_name=device.model_name,
            generation=device.generation,
            category_id=device.category_id,
            category=device.category.name,
            entity_id=device.entity_id,
            entity=device.entity.name,
            order_number=device.order_number,
            location_id=device.location_id,
            location=device.location.name,
            owner_id=device.owner_id,
            owner=device.owner.username,
            client_id=device.client_id,
            client=device.client.name if device.client else None,
            is_pv=device.is_pv,
            cpu=device.cpu,
            ram_gb=device.ram_gb,
            storage_gb=device.storage_gb,
            screen_size=device.screen_size,
            power_w=device.power_w,
            comment=device.comment,
            is_archived=device.is_archived,
            created_by=device.created_by,
            updated_by=device.updated_by,
            created_at=device.created_at,
            updated_at=device.updated_at,
        )


# ---------------------------------------------------------------------------
# DeviceHistory
# ---------------------------------------------------------------------------


class DeviceHistoryRead(BaseModel):
    id: int
    device_id: int
    user_id: int
    username: str
    field_changed: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_history(cls, entry) -> "DeviceHistoryRead":
        return cls(
            id=entry.id,
            device_id=entry.device_id,
            user_id=entry.user_id,
            username=entry.user.username,
            field_changed=entry.field_changed,
            old_value=entry.old_value,
            new_value=entry.new_value,
            changed_at=entry.changed_at,
        )


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class LoginCredentials(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class TokenData(BaseModel):
    user_id: int
    role: str


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------


class StatCount(BaseModel):
    id: int
    name: str
    count: int


class StatBucket(BaseModel):
    """Regroupement par valeur textuelle (ex. génération) sans table de référence."""

    label: str
    count: int


class StatsSummary(BaseModel):
    total_devices: int
    active_devices: int
    archived_devices: int
    by_category: list[StatCount]
    by_location: list[StatCount]
    by_entity: list[StatCount]
    by_owner: list[StatCount]
    by_generation: list[StatBucket]
