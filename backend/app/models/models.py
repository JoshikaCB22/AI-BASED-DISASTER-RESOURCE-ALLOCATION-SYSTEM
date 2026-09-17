from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="analyst")  # admin, disaster_manager, relief_coordinator, analyst
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Disaster(Base):
    __tablename__ = "disasters"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    disaster_type = Column(String, nullable=False)  # Flood, Cyclone, Earthquake, etc.
    location = Column(String, nullable=False)
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    date = Column(String, nullable=False)
    status = Column(String, default="Active")  # Active, Monitoring, Resolved
    severity = Column(String, default="Moderate")  # Low, Moderate, High, Critical
    severity_score = Column(Float, default=0.0)
    affected_population = Column(Integer, default=0)
    area_affected = Column(Float, default=0.0)
    rainfall = Column(Float, default=0.0)
    wind_speed = Column(Float, default=0.0)
    water_level = Column(Float, default=0.0)
    magnitude = Column(Float, default=0.0)
    infrastructure_damage = Column(Float, default=0.0)
    medical_emergencies = Column(Integer, default=0)
    road_accessibility = Column(Float, default=100.0)
    duration_days = Column(Integer, default=1)
    description = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    areas = relationship("AffectedArea", back_populates="disaster", cascade="all, delete")
    allocations = relationship("Allocation", back_populates="disaster", cascade="all, delete")


class AffectedArea(Base):
    __tablename__ = "affected_areas"
    id = Column(Integer, primary_key=True, index=True)
    disaster_id = Column(Integer, ForeignKey("disasters.id"), nullable=False)
    name = Column(String, nullable=False)
    district = Column(String, default="")
    state = Column(String, default="")
    latitude = Column(Float, default=0.0)
    longitude = Column(Float, default=0.0)
    affected_population = Column(Integer, default=0)
    vulnerable_population = Column(Integer, default=0)
    infrastructure_damage = Column(Float, default=0.0)
    medical_emergencies = Column(Integer, default=0)
    road_accessibility = Column(Float, default=100.0)
    priority_score = Column(Float, default=0.0)
    priority_level = Column(String, default="Medium")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    disaster = relationship("Disaster", back_populates="areas")
    allocations = relationship("Allocation", back_populates="area", cascade="all, delete")


class Resource(Base):
    __tablename__ = "resources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)  # Food, Water, Medical, etc.
    unit = Column(String, default="units")
    quantity_available = Column(Float, default=0.0)
    min_stock_level = Column(Float, default=0.0)
    supplier = Column(String, default="")
    warehouse = Column(String, default="")
    status = Column(String, default="Available")  # Available, Low Stock, Out of Stock
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    allocations = relationship("Allocation", back_populates="resource")


class Allocation(Base):
    __tablename__ = "allocations"
    id = Column(Integer, primary_key=True, index=True)
    disaster_id = Column(Integer, ForeignKey("disasters.id"), nullable=False)
    area_id = Column(Integer, ForeignKey("affected_areas.id"), nullable=False)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False)
    required_qty = Column(Float, default=0.0)
    allocated_qty = Column(Float, default=0.0)
    shortage = Column(Float, default=0.0)
    priority_score = Column(Float, default=0.0)
    priority_level = Column(String, default="Medium")
    status = Column(String, default="Pending")  # Pending, Approved, Dispatched, Delivered, Rejected
    reason = Column(Text, default="")
    approved_by = Column(String, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    disaster = relationship("Disaster", back_populates="allocations")
    area = relationship("AffectedArea", back_populates="allocations")
    resource = relationship("Resource", back_populates="allocations")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String, default="system")
    action = Column(String, nullable=False)
    entity = Column(String, default="")
    entity_id = Column(Integer, default=0)
    detail = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
