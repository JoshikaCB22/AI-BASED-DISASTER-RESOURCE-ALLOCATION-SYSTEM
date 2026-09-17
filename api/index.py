"""
Vercel Serverless Function for FastAPI Backend
This runs on Vercel as a serverless function
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.routes import auth, disasters, areas, resources, allocations, predictions, dashboard, users, audit, reports

# Create tables
Base.metadata.create_all(bind=engine)

# Seed data (first time only)
db = SessionLocal()
try:
    from app.models.models import User
    if db.query(User).count() == 0:
        from app.seed import seed_db
        seed_db(db)
finally:
    db.close()

# Create FastAPI app
app = FastAPI(
    title="AI Disaster Relief Resource Allocation",
    description="Intelligent disaster relief management with AI predictions and optimization.",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(disasters.router)
app.include_router(areas.router)
app.include_router(resources.router)
app.include_router(allocations.router)
app.include_router(predictions.router)
app.include_router(dashboard.router)
app.include_router(users.router)
app.include_router(audit.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {"message": "AI Disaster Relief API", "docs": "/docs"}

# Vercel handler
handler = app
