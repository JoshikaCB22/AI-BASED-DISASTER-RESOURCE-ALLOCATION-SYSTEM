from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.models import Disaster, AuditLog
from app.auth import get_current_user
from app.models.models import User

router = APIRouter(prefix="/disasters", tags=["Disasters"])


class DisasterIn(BaseModel):
    name: str
    disaster_type: str
    location: str
    latitude: float = 0.0
    longitude: float = 0.0
    date: str
    status: str = "Active"
    severity: str = "Moderate"
    affected_population: int = 0
    area_affected: float = 0.0
    rainfall: float = 0.0
    wind_speed: float = 0.0
    water_level: float = 0.0
    magnitude: float = 0.0
    infrastructure_damage: float = 0.0
    medical_emergencies: int = 0
    road_accessibility: float = 100.0
    duration_days: int = 1
    description: str = ""


@router.get("/")
def list_disasters(
    status: Optional[str] = None,
    disaster_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    q = db.query(Disaster)
    if status:
        q = q.filter(Disaster.status == status)
    if disaster_type:
        q = q.filter(Disaster.disaster_type == disaster_type)
    if search:
        q = q.filter(Disaster.name.ilike(f"%{search}%"))
    return q.order_by(Disaster.created_at.desc()).all()


@router.post("/", status_code=201)
def create_disaster(body: DisasterIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "disaster_manager"):
        raise HTTPException(403, "Not allowed")
    d = Disaster(**body.model_dump())
    db.add(d)
    db.flush()
    db.add(AuditLog(user_email=user.email, action="CREATE_DISASTER", entity="Disaster", entity_id=d.id, detail=d.name))
    db.commit()
    db.refresh(d)
    return d


@router.get("/{did}")
def get_disaster(did: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    d = db.get(Disaster, did)
    if not d:
        raise HTTPException(404, "Not found")
    return d


@router.put("/{did}")
def update_disaster(did: int, body: DisasterIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "disaster_manager"):
        raise HTTPException(403, "Not allowed")
    d = db.get(Disaster, did)
    if not d:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(d, k, v)
    db.add(AuditLog(user_email=user.email, action="UPDATE_DISASTER", entity="Disaster", entity_id=d.id))
    db.commit()
    db.refresh(d)
    return d


@router.delete("/{did}")
def delete_disaster(did: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(403, "Admin only")
    d = db.get(Disaster, did)
    if not d:
        raise HTTPException(404, "Not found")
    db.add(AuditLog(user_email=user.email, action="DELETE_DISASTER", entity="Disaster", entity_id=d.id, detail=d.name))
    db.delete(d)
    db.commit()
    return {"ok": True}
