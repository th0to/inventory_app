from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from dependencies import get_current_user, get_db
from models import Category, Device, Entity, Location, User
from schemas import StatCount, StatsSummary

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
    )
