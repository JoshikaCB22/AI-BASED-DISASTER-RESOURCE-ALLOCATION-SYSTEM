"""
AI-Based Disaster Relief Resource Allocation System — Backend
Run: uvicorn app.main:app --reload
API docs: http://localhost:8000/docs
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

from app.database import Base, engine, SessionLocal
from app.routes import auth, disasters, areas, resources, allocations, predictions, dashboard, users, audit, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        from app.seed import seed_db
        seed_db(db)
    finally:
        db.close()
    yield
    # Shutdown (nothing needed)


app = FastAPI(
    title="AI Disaster Relief Resource Allocation",
    description="Intelligent disaster relief management with AI predictions and optimization.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
