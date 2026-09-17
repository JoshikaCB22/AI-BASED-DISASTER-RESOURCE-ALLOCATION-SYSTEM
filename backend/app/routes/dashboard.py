from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import Disaster, AffectedArea, Resource, Allocation, User
from app.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def summary(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    active_disasters = db.query(Disaster).filter(Disaster.status == "Active").count()
    total_disasters  = db.query(Disaster).count()
    total_affected   = db.query(func.sum(Disaster.affected_population)).filter(Disaster.status == "Active").scalar() or 0
    critical_areas   = db.query(AffectedArea).filter(AffectedArea.priority_level == "Critical").count()

    total_available  = db.query(func.sum(Resource.quantity_available)).scalar() or 0
    low_stock        = db.query(Resource).filter(Resource.status == "Low Stock").count()
    out_of_stock     = db.query(Resource).filter(Resource.status == "Out of Stock").count()

    pending          = db.query(Allocation).filter(Allocation.status == "Pending").count()
    approved         = db.query(Allocation).filter(Allocation.status == "Approved").count()
    dispatched       = db.query(Allocation).filter(Allocation.status == "Dispatched").count()

    total_shortage   = db.query(func.sum(Allocation.shortage)).scalar() or 0
    total_allocated  = db.query(func.sum(Allocation.allocated_qty)).scalar() or 0

    return {
        "active_disasters":    active_disasters,
        "total_disasters":     total_disasters,
        "total_affected":      int(total_affected),
        "critical_areas":      critical_areas,
        "total_available":     round(float(total_available), 1),
        "low_stock_items":     low_stock,
        "out_of_stock_items":  out_of_stock,
        "pending_approvals":   pending,
        "approved":            approved,
        "dispatched":          dispatched,
        "total_shortage":      round(float(total_shortage), 1),
        "total_allocated":     round(float(total_allocated), 1),
    }


@router.get("/severity-chart")
def severity_chart(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(Disaster.severity, func.count().label("count")).group_by(Disaster.severity).all()
    return [{"severity": r.severity, "count": r.count} for r in rows]


@router.get("/resource-chart")
def resource_chart(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(Resource.category,
                    func.sum(Resource.quantity_available).label("available")).group_by(Resource.category).all()
    return [{"category": r.category, "available": round(float(r.available or 0), 1)} for r in rows]


@router.get("/allocation-chart")
def allocation_chart(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(Allocation.status, func.count().label("count")).group_by(Allocation.status).all()
    return [{"status": r.status, "count": r.count} for r in rows]
