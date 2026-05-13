import enum

from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class UserRole(str, enum.Enum):
    VISITOR = "visitor"
    USER = "user"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.USER
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[TIMESTAMP] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    owned_devices: Mapped[list["Device"]] = relationship(
        "Device",
        back_populates="owner",
        foreign_keys="Device.owner_id",
    )
    created_devices: Mapped[list["Device"]] = relationship(
        "Device",
        back_populates="creator",
        foreign_keys="Device.created_by",
    )
    updated_devices: Mapped[list["Device"]] = relationship(
        "Device",
        back_populates="updater",
        foreign_keys="Device.updated_by",
    )
    history_entries: Mapped[list["DeviceHistory"]] = relationship(
        "DeviceHistory", back_populates="user"
    )


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    devices: Mapped[list["Device"]] = relationship("Device", back_populates="category")


class Entity(Base):
    __tablename__ = "entities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    has_order_num: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    devices: Mapped[list["Device"]] = relationship("Device", back_populates="entity")


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)

    devices: Mapped[list["Device"]] = relationship("Device", back_populates="location")


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sent_date: Mapped[TIMESTAMP | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    devices: Mapped[list["Device"]] = relationship("Device", back_populates="client")


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    serial_number: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)
    generation: Mapped[str | None] = mapped_column(String(50), nullable=True)

    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id"), nullable=False)
    order_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), nullable=True)

    is_pv: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    cpu: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ram_gb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_gb: Mapped[int | None] = mapped_column(Integer, nullable=True)
    screen_size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    power_w: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[TIMESTAMP] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[TIMESTAMP] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    category: Mapped[Category] = relationship("Category", back_populates="devices")
    entity: Mapped[Entity] = relationship("Entity", back_populates="devices")
    location: Mapped[Location] = relationship("Location", back_populates="devices")
    client: Mapped[Client | None] = relationship("Client", back_populates="devices")

    owner: Mapped[User] = relationship(
        "User",
        back_populates="owned_devices",
        foreign_keys=[owner_id],
    )
    creator: Mapped[User] = relationship(
        "User",
        back_populates="created_devices",
        foreign_keys=[created_by],
    )
    updater: Mapped[User | None] = relationship(
        "User",
        back_populates="updated_devices",
        foreign_keys=[updated_by],
    )

    history_entries: Mapped[list["DeviceHistory"]] = relationship(
        "DeviceHistory", back_populates="device", cascade="all, delete-orphan"
    )


class DeviceHistory(Base):
    __tablename__ = "device_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    device_id: Mapped[int] = mapped_column(ForeignKey("devices.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    field_changed: Mapped[str] = mapped_column(String(100), nullable=False)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    changed_at: Mapped[TIMESTAMP] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now()
    )

    device: Mapped[Device] = relationship("Device", back_populates="history_entries")
    user: Mapped[User] = relationship("User", back_populates="history_entries")
