from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.models import AffectedArea, Disaster, AuditLog, User
from app.auth import get_current_user
from app.ml.predictor import calc_priority

router = APIRouter(prefix="/areas", tags=["Affected Areas"])


class AreaIn(BaseModel):
    disaster_id: int
    name: str
    district: str = ""
    state: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    affected_population: int = 0
    vulnerable_population: int = 0
    infrastructure_damage: float = 0.0
    medical_emergencies: int = 0
    road_accessibility: float = 100.0


@router.get("/")
def list_areas(
    disaster_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    q = db.query(AffectedArea)
    if disaster_id:
        q = q.filter(AffectedArea.disaster_id == disaster_id)
    return q.order_by(AffectedArea.priority_score.desc()).all()


@router.post("/", status_code=201)
def create_area(body: AreaIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "disaster_manager"):
        raise HTTPException(403, "Not allowed")
    disaster = db.get(Disaster, body.disaster_id)
    if not disaster:
        raise HTTPException(404, "Disaster not found")

    score, level = calc_priority(
        disaster.severity_score or 50,
        body.affected_population, body.vulnerable_population,
        body.medical_emergencies, body.infrastructure_damage, body.road_accessibility
    )
    area = AffectedArea(**body.model_dump(), priority_score=score, priority_level=level)
    db.add(area)
    db.flush()
    db.add(AuditLog(user_email=user.email, action="CREATE_AREA", entity="AffectedArea", entity_id=area.id, detail=area.name))
    db.commit()
    db.refresh(area)
    return area


@router.put("/{aid}")
def update_area(aid: int, body: AreaIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "disaster_manager"):
        raise HTTPException(403, "Not allowed")
    area = db.get(AffectedArea, aid)
    if not area:
        raise HTTPException(404, "Not found")
    disaster = db.get(Disaster, body.disaster_id)
    score, level = calc_priority(
        disaster.severity_score or 50 if disaster else 50,
        body.affected_population, body.vulnerable_population,
        body.medical_emergencies, body.infrastructure_damage, body.road_accessibility
    )
    for k, v in body.model_dump().items():
        setattr(area, k, v)
    area.priority_score = score
    area.priority_level = level
    db.commit()
    db.refresh(area)
    return area


@router.delete("/{aid}")
def delete_area(aid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "disaster_manager"):
        raise HTTPException(403, "Not allowed")
    area = db.get(AffectedArea, aid)
    if not area:
        raise HTTPException(404, "Not found")
    db.delete(area)
    db.commit()
    return {"ok": True}
