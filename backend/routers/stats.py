from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import Category, Device, Entity, Location, User
from schemas import StatBucket, StatCount, StatsSummary

router = APIRouter(prefix="/api/stats", tags=["stats"])


def _grouped_counts(db: Session, model, relation_field):
    rows = db.execute(
        select(
            model.id,
            model.name,
            func.count(Device.id).label("count"),
        )
        .outerjoin(Device, relation_field == model.id)
        .group_by(model.id, model.name)
        .order_by(model.name.asc())
    ).all()
    return [StatCount(id=row.id, name=row.name, count=row.count) for row in rows]


def _counts_by_owner(db: Session):
    # Inner join : seuls les responsables ayant au moins un appareil, triés du plus
    # gros parc au plus petit.
    rows = db.execute(
        select(
            User.id,
            User.username,
            func.count(Device.id).label("count"),
        )
        .join(Device, Device.owner_id == User.id)
        .group_by(User.id, User.username)
        .order_by(func.count(Device.id).desc(), User.username.asc())
    ).all()
    return [StatCount(id=row.id, name=row.username, count=row.count) for row in rows]


def _counts_by_generation(db: Session):
    # generation est une colonne texte nullable (pas de table de référence) : on
    # regroupe la valeur brute, NULL/"" devenant « Non renseigné ».
    label = func.coalesce(func.nullif(Device.generation, ""), "Non renseigné")
    rows = db.execute(
        select(
            label.label("label"),
            func.count(Device.id).label("count"),
        )
        .group_by(label)
        .order_by(func.count(Device.id).desc(), label.asc())
    ).all()
    return [StatBucket(label=row.label, count=row.count) for row in rows]


@router.get("/summary", response_model=StatsSummary)
def get_summary(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StatsSummary:
    total_devices = db.scalar(select(func.count(Device.id))) or 0
    archived_devices = (
        db.scalar(select(func.count(Device.id)).where(Device.is_archived.is_(True))) or 0
    )

    return StatsSummary(
        total_devices=total_devices,
        active_devices=total_devices - archived_devices,
        archived_devices=archived_devices,
        by_category=_grouped_counts(db, Category, Device.category_id),
        by_location=_grouped_counts(db, Location, Device.location_id),
        by_entity=_grouped_counts(db, Entity, Device.entity_id),
        by_owner=_counts_by_owner(db),
        by_generation=_counts_by_generation(db),
    )
