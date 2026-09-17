from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.auth import get_current_user
from app.models.models import User
from app.ml.predictor import predict_severity, predict_resources

router = APIRouter(prefix="/predictions", tags=["Predictions"])


class SeverityIn(BaseModel):
    disaster_type: str = "Flood"
    affected_population: int = 0
    rainfall: float = 0.0
    wind_speed: float = 0.0
    water_level: float = 0.0
    magnitude: float = 0.0
    infrastructure_damage: float = 0.0
    medical_emergencies: int = 0
    road_accessibility: float = 100.0


class ResourceIn(BaseModel):
    disaster_type: str = "Flood"
    affected_population: int = 0
    severity_category: str = "Moderate"
    duration_days: int = 1
    medical_emergencies: int = 0
    vulnerable_population: int = 0


@router.post("/severity")
def severity_prediction(body: SeverityIn, _: User = Depends(get_current_user)):
    return predict_severity(body.model_dump())


@router.post("/resources")
def resource_prediction(body: ResourceIn, _: User = Depends(get_current_user)):
    return predict_resources(body.model_dump())
