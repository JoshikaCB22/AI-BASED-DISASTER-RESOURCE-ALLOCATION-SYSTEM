from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import AuditLog, User
from app.auth import require_roles

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("/")
def get_logs(
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin"))
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
