from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.models import Resource, AuditLog, User
from app.auth import get_current_user

router = APIRouter(prefix="/resources", tags=["Resources"])


class ResourceIn(BaseModel):
    name: str
    category: str
    unit: str = "units"
    quantity_available: float = 0.0
    min_stock_level: float = 0.0
    supplier: str = ""
    warehouse: str = ""


class StockUpdate(BaseModel):
    action: str          # "increase" or "decrease"
    quantity: float
    reason: str = ""


def _status(qty, min_stock):
    if qty <= 0:
        return "Out of Stock"
    if qty < min_stock:
        return "Low Stock"
    return "Available"


@router.get("/")
def list_resources(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    q = db.query(Resource)
    if category:
        q = q.filter(Resource.category == category)
    if status:
        q = q.filter(Resource.status == status)
    return q.all()


@router.post("/", status_code=201)
def create_resource(body: ResourceIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "relief_coordinator"):
        raise HTTPException(403, "Not allowed")
    r = Resource(**body.model_dump(),
                 status=_status(body.quantity_available, body.min_stock_level))
    db.add(r)
    db.flush()
    db.add(AuditLog(user_email=user.email, action="CREATE_RESOURCE", entity="Resource",
                    entity_id=r.id, detail=r.name))
    db.commit()
    db.refresh(r)
    return r


@router.put("/{rid}")
def update_resource(rid: int, body: ResourceIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "relief_coordinator"):
        raise HTTPException(403, "Not allowed")
    r = db.get(Resource, rid)
    if not r:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump().items():
        setattr(r, k, v)
    r.status = _status(r.quantity_available, r.min_stock_level)
    db.commit()
    db.refresh(r)
    return r


@router.post("/{rid}/stock")
def update_stock(rid: int, body: StockUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "relief_coordinator"):
        raise HTTPException(403, "Not allowed")
    r = db.get(Resource, rid)
    if not r:
        raise HTTPException(404, "Not found")
    if body.action == "increase":
        r.quantity_available += body.quantity
    elif body.action == "decrease":
        if body.quantity > r.quantity_available:
            raise HTTPException(400, "Insufficient stock")
        r.quantity_available -= body.quantity
    else:
        raise HTTPException(400, "action must be 'increase' or 'decrease'")
    r.status = _status(r.quantity_available, r.min_stock_level)
    db.add(AuditLog(user_email=user.email, action=f"STOCK_{body.action.upper()}",
                    entity="Resource", entity_id=r.id,
                    detail=f"{body.action} {body.quantity} {r.unit}. Reason: {body.reason}"))
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{rid}")
def delete_resource(rid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "relief_coordinator"):
        raise HTTPException(403, "Not allowed")
    r = db.get(Resource, rid)
    if not r:
        raise HTTPException(404, "Not found")
    db.delete(r)
    db.commit()
    return {"ok": True}
