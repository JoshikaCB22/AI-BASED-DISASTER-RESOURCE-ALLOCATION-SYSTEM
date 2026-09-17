from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict
from app.database import get_db
from app.models.models import Allocation, AffectedArea, Resource, Disaster, AuditLog, User
from app.auth import get_current_user
from app.ml.predictor import predict_resources, calc_priority, optimize_allocation

router = APIRouter(prefix="/allocations", tags=["Allocation"])


# ── Predict resource requirements for a disaster ──────────────────────────────
@router.post("/predict-requirements/{disaster_id}")
def predict_requirements(
    disaster_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    disaster = db.get(Disaster, disaster_id)
    if not disaster:
        raise HTTPException(404, "Disaster not found")

    areas = db.query(AffectedArea).filter(AffectedArea.disaster_id == disaster_id).all()
    if not areas:
        raise HTTPException(400, "No affected areas — add areas first")

    RESOURCE_MAP = {
        "food_packets":    "Food Packets",
        "water_liters":    "Drinking Water",
        "medicine_units":  "Medicines",
        "medical_kits":    "Medical Kits",
        "blankets":        "Blankets",
        "tents":           "Tents",
        "sanitation_kits": "Sanitation Kits",
    }

    results = []
    for area in areas:
        inp = {
            "disaster_type":        disaster.disaster_type,
            "affected_population":  area.affected_population,
            "severity_category":    disaster.severity,
            "duration_days":        disaster.duration_days,
            "medical_emergencies":  area.medical_emergencies,
            "vulnerable_population":area.vulnerable_population,
        }
        preds = predict_resources(inp)["predictions"]
        for key, res_name in RESOURCE_MAP.items():
            res = db.query(Resource).filter(Resource.name == res_name).first()
            if res:
                results.append({
                    "area_id": area.id, "area_name": area.name,
                    "resource_id": res.id, "resource_name": res.name,
                    "unit": res.unit,
                    "required_qty": preds[key],
                    "priority_score": area.priority_score,
                    "priority_level": area.priority_level,
                    "affected_population": area.affected_population,
                    "medical_emergencies": area.medical_emergencies,
                    "infrastructure_damage": area.infrastructure_damage,
                })

    db.add(AuditLog(user_email=user.email, action="PREDICT_REQUIREMENTS",
                    entity="Disaster", entity_id=disaster_id))
    db.commit()
    return {"disaster_id": disaster_id, "requirements": results, "areas": len(areas)}


# ── Run optimization and save allocations ────────────────────────────────────
@router.post("/optimize/{disaster_id}")
def optimize(
    disaster_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if user.role not in ("admin", "disaster_manager", "relief_coordinator"):
        raise HTTPException(403, "Not allowed")

    disaster = db.get(Disaster, disaster_id)
    if not disaster:
        raise HTTPException(404, "Disaster not found")

    areas = db.query(AffectedArea).filter(AffectedArea.disaster_id == disaster_id).all()
    if not areas:
        raise HTTPException(400, "No affected areas found")

    # Build requirements the same way as predict
    RESOURCE_MAP = {
        "food_packets":    "Food Packets",
        "water_liters":    "Drinking Water",
        "medicine_units":  "Medicines",
        "medical_kits":    "Medical Kits",
        "blankets":        "Blankets",
        "tents":           "Tents",
        "sanitation_kits": "Sanitation Kits",
    }
    requirements = []
    for area in areas:
        inp = {
            "disaster_type":         disaster.disaster_type,
            "affected_population":   area.affected_population,
            "severity_category":     disaster.severity,
            "duration_days":         disaster.duration_days,
            "medical_emergencies":   area.medical_emergencies,
            "vulnerable_population": area.vulnerable_population,
        }
        preds = predict_resources(inp)["predictions"]
        for key, res_name in RESOURCE_MAP.items():
            res = db.query(Resource).filter(Resource.name == res_name).first()
            if res:
                requirements.append({
                    "area_id": area.id, "area_name": area.name,
                    "resource_id": res.id, "resource_name": res.name,
                    "unit": res.unit,
                    "required_qty": preds[key],
                    "priority_score": area.priority_score,
                    "priority_level": area.priority_level,
                    "affected_population": area.affected_population,
                    "medical_emergencies": area.medical_emergencies,
                    "infrastructure_damage": area.infrastructure_damage,
                })

    available = {r.id: r.quantity_available for r in db.query(Resource).all()}
    alloc_results = optimize_allocation(requirements, available)

    # Delete old pending allocations for this disaster
    db.query(Allocation).filter(
        Allocation.disaster_id == disaster_id,
        Allocation.status == "Pending"
    ).delete()

    saved = []
    for r in alloc_results:
        a = Allocation(
            disaster_id=disaster_id,
            area_id=r["area_id"],
            resource_id=r["resource_id"],
            required_qty=r["required_qty"],
            allocated_qty=r["allocated_qty"],
            shortage=r["shortage"],
            priority_score=r["priority_score"],
            priority_level=r["priority_level"],
            status="Pending",
            reason=r["reason"],
        )
        db.add(a)
        saved.append(r)

    db.add(AuditLog(user_email=user.email, action="OPTIMIZE_ALLOCATION",
                    entity="Disaster", entity_id=disaster_id,
                    detail=f"{len(saved)} allocations created"))
    db.commit()

    total_shortage = sum(r["shortage"] for r in saved)
    return {
        "disaster_id": disaster_id,
        "allocations": saved,
        "total_allocations": len(saved),
        "total_shortage": round(total_shortage, 1),
        "method": "Priority-Aware Greedy"
    }


# ── List allocations ──────────────────────────────────────────────────────────
@router.get("/")
def list_allocations(
    disaster_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    q = db.query(Allocation)
    if disaster_id:
        q = q.filter(Allocation.disaster_id == disaster_id)
    if status:
        q = q.filter(Allocation.status == status)

    allocs = q.order_by(Allocation.priority_score.desc()).all()
    result = []
    for a in allocs:
        result.append({
            "id": a.id, "disaster_id": a.disaster_id,
            "area_name": a.area.name if a.area else "",
            "resource_name": a.resource.name if a.resource else "",
            "unit": a.resource.unit if a.resource else "",
            "required_qty": a.required_qty,
            "allocated_qty": a.allocated_qty,
            "shortage": a.shortage,
            "priority_score": a.priority_score,
            "priority_level": a.priority_level,
            "status": a.status,
            "reason": a.reason,
            "approved_by": a.approved_by,
            "created_at": str(a.created_at),
        })
    return result


# ── Approve / Reject ──────────────────────────────────────────────────────────
class ActionIn(BaseModel):
    comments: str = ""


@router.post("/{aid}/approve")
def approve(aid: int, body: ActionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "disaster_manager"):
        raise HTTPException(403, "Not allowed")
    a = db.get(Allocation, aid)
    if not a:
        raise HTTPException(404, "Not found")
    if a.status not in ("Pending",):
        raise HTTPException(400, f"Cannot approve allocation with status '{a.status}'")

    # Deduct from inventory
    res = db.get(Resource, a.resource_id)
    if res:
        res.quantity_available = max(res.quantity_available - a.allocated_qty, 0)
        if res.quantity_available == 0:
            res.status = "Out of Stock"
        elif res.quantity_available < res.min_stock_level:
            res.status = "Low Stock"

    a.status = "Approved"
    a.approved_by = user.email
    if body.comments:
        a.reason += f"\nApproval note: {body.comments}"

    db.add(AuditLog(user_email=user.email, action="APPROVE_ALLOCATION",
                    entity="Allocation", entity_id=a.id))
    db.commit()
    return {"ok": True, "status": "Approved"}


@router.post("/{aid}/reject")
def reject(aid: int, body: ActionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role not in ("admin", "disaster_manager"):
        raise HTTPException(403, "Not allowed")
    a = db.get(Allocation, aid)
    if not a:
        raise HTTPException(404, "Not found")
    a.status = "Rejected"
    if body.comments:
        a.reason += f"\nRejection reason: {body.comments}"
    db.add(AuditLog(user_email=user.email, action="REJECT_ALLOCATION",
                    entity="Allocation", entity_id=a.id))
    db.commit()
    return {"ok": True, "status": "Rejected"}


@router.post("/{aid}/dispatch")
def dispatch(aid: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    a = db.get(Allocation, aid)
    if not a or a.status != "Approved":
        raise HTTPException(400, "Must be Approved first")
    a.status = "Dispatched"
    db.commit()
    return {"ok": True}


# ── Shortage summary ──────────────────────────────────────────────────────────
@router.get("/shortages/{disaster_id}")
def shortages(disaster_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    allocs = db.query(Allocation).filter(Allocation.disaster_id == disaster_id).all()
    if not allocs:
        return []
    from collections import defaultdict
    agg = defaultdict(lambda: {"required": 0, "allocated": 0, "shortage": 0})
    names = {}
    units = {}
    for a in allocs:
        rid = a.resource_id
        agg[rid]["required"]  += a.required_qty
        agg[rid]["allocated"] += a.allocated_qty
        agg[rid]["shortage"]  += a.shortage
        if a.resource:
            names[rid] = a.resource.name
            units[rid] = a.resource.unit
    result = []
    for rid, vals in agg.items():
        avail = db.get(Resource, rid)
        result.append({
            "resource_id": rid,
            "resource_name": names.get(rid, str(rid)),
            "unit": units.get(rid, ""),
            "required":  round(vals["required"], 1),
            "available": round(avail.quantity_available if avail else 0, 1),
            "allocated": round(vals["allocated"], 1),
            "shortage":  round(vals["shortage"], 1),
            "status": "SHORTAGE" if vals["shortage"] > 0 else "OK",
        })
    return sorted(result, key=lambda x: x["shortage"], reverse=True)


# ── What-If simulation ────────────────────────────────────────────────────────
class SimIn(BaseModel):
    disaster_id: int
    resource_overrides: Optional[Dict[int, float]] = None  # resource_id → new qty
    severity_override: Optional[str] = None

@router.post("/simulate")
def simulate(body: SimIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    disaster = db.get(Disaster, body.disaster_id)
    if not disaster:
        raise HTTPException(404, "Disaster not found")

    areas = db.query(AffectedArea).filter(AffectedArea.disaster_id == body.disaster_id).all()
    if not areas:
        raise HTTPException(400, "No areas")

    RESOURCE_MAP = {
        "food_packets": "Food Packets", "water_liters": "Drinking Water",
        "medicine_units": "Medicines", "medical_kits": "Medical Kits",
        "blankets": "Blankets", "tents": "Tents", "sanitation_kits": "Sanitation Kits",
    }

    sev_cat = body.severity_override or disaster.severity
    requirements = []
    for area in areas:
        inp = {
            "disaster_type": disaster.disaster_type,
            "affected_population": area.affected_population,
            "severity_category": sev_cat,
            "duration_days": disaster.duration_days,
            "medical_emergencies": area.medical_emergencies,
            "vulnerable_population": area.vulnerable_population,
        }
        preds = predict_resources(inp)["predictions"]
        for key, res_name in RESOURCE_MAP.items():
            res = db.query(Resource).filter(Resource.name == res_name).first()
            if res:
                requirements.append({
                    "area_id": area.id, "area_name": area.name,
                    "resource_id": res.id, "resource_name": res.name, "unit": res.unit,
                    "required_qty": preds[key],
                    "priority_score": area.priority_score, "priority_level": area.priority_level,
                    "affected_population": area.affected_population,
                    "medical_emergencies": area.medical_emergencies,
                    "infrastructure_damage": area.infrastructure_damage,
                })

    # Original availability
    all_resources = db.query(Resource).all()
    orig_available = {r.id: r.quantity_available for r in all_resources}

    # Simulated availability
    sim_available = dict(orig_available)
    if body.resource_overrides:
        for rid, qty in body.resource_overrides.items():
            sim_available[int(rid)] = max(0.0, qty)

    orig_allocs = optimize_allocation(requirements, orig_available)
    sim_allocs  = optimize_allocation(requirements, sim_available)

    orig_shortage = sum(r["shortage"] for r in orig_allocs)
    sim_shortage  = sum(r["shortage"] for r in sim_allocs)

    db.add(AuditLog(user_email=user.email, action="RUN_SIMULATION",
                    entity="Disaster", entity_id=body.disaster_id))
    db.commit()

    return {
        "original":  {"allocations": orig_allocs, "total_shortage": round(orig_shortage, 1)},
        "simulated": {"allocations": sim_allocs,  "total_shortage": round(sim_shortage, 1)},
        "change":    {"shortage_diff": round(sim_shortage - orig_shortage, 1)},
    }
