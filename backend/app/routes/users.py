from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.database import get_db
from app.models.models import User, AuditLog
from app.auth import get_current_user, hash_password, require_roles

router = APIRouter(prefix="/users", tags=["Users"])


class UserIn(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "analyst"


class UserUpdate(BaseModel):
    full_name: str
    role: str
    is_active: bool = True


@router.get("/")
def list_users(db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    return db.query(User).all()


@router.post("/", status_code=201)
def create_user(body: UserIn, db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    u = User(email=body.email, full_name=body.full_name,
             hashed_password=hash_password(body.password), role=body.role)
    db.add(u)
    db.flush()
    db.add(AuditLog(user_email=user.email, action="CREATE_USER", entity="User", entity_id=u.id))
    db.commit()
    db.refresh(u)
    return {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role}


@router.put("/{uid}")
def update_user(uid: int, body: UserUpdate, db: Session = Depends(get_db),
                user: User = Depends(require_roles("admin"))):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "Not found")
    u.full_name = body.full_name
    u.role = body.role
    u.is_active = body.is_active
    db.commit()
    return {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role}


@router.delete("/{uid}")
def delete_user(uid: int, db: Session = Depends(get_db), user: User = Depends(require_roles("admin"))):
    if uid == user.id:
        raise HTTPException(400, "Cannot delete yourself")
    u = db.get(User, uid)
    if not u:
        raise HTTPException(404, "Not found")
    db.delete(u)
    db.commit()
    return {"ok": True}
