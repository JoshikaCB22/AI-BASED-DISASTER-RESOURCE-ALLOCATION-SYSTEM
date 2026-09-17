import csv, io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Disaster, Allocation, AffectedArea, Resource, User
from app.auth import get_current_user

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/csv/{disaster_id}")
def export_csv(disaster_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    disaster = db.get(Disaster, disaster_id)
    if not disaster:
        raise HTTPException(404, "Disaster not found")

    allocs = db.query(Allocation).filter(Allocation.disaster_id == disaster_id).all()

    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(["AI-Based Disaster Relief Resource Allocation System — Report"])
    w.writerow([f"Disaster: {disaster.name}  |  Type: {disaster.disaster_type}  |  Severity: {disaster.severity}  |  Status: {disaster.status}"])
    w.writerow([f"Location: {disaster.location}  |  Affected: {disaster.affected_population:,}  |  Date: {disaster.date}"])
    w.writerow(["[This is a demonstration report using sample data]"])
    w.writerow([])
    w.writerow(["Area", "Resource", "Required", "Allocated", "Shortage", "Priority", "Status"])
    for a in allocs:
        w.writerow([
            a.area.name if a.area else "",
            a.resource.name if a.resource else "",
            a.required_qty, a.allocated_qty, a.shortage,
            a.priority_level, a.status
        ])
    w.writerow([])
    w.writerow(["Summary"])
    w.writerow(["Total Allocations", len(allocs)])
    w.writerow(["Total Allocated", sum(a.allocated_qty for a in allocs)])
    w.writerow(["Total Shortage",   sum(a.shortage     for a in allocs)])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=report_disaster_{disaster_id}.csv"}
    )
