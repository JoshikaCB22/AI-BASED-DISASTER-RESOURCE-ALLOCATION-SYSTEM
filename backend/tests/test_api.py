"""
Basic API tests — run with: pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["DATABASE_URL"] = "sqlite:///./test_disaster.db"

from app.main import app
from app.database import Base, engine, SessionLocal
from app.seed import seed_db

Base.metadata.create_all(bind=engine)
db = SessionLocal()
seed_db(db)
db.close()

client = TestClient(app)
TOKEN = None


def get_token():
    global TOKEN
    if not TOKEN:
        r = client.post("/auth/login", json={"email": "admin@disaster.ai", "password": "Admin@123"})
        TOKEN = r.json()["access_token"]
    return TOKEN


def auth():
    return {"Authorization": f"Bearer {get_token()}"}


# ─── Auth ────────────────────────────────────────────────────────────────────

def test_login_success():
    r = client.post("/auth/login", json={"email": "admin@disaster.ai", "password": "Admin@123"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password():
    r = client.post("/auth/login", json={"email": "admin@disaster.ai", "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_user():
    r = client.post("/auth/login", json={"email": "nobody@x.com", "password": "x"})
    assert r.status_code == 401


def test_me():
    r = client.get("/auth/me", headers=auth())
    assert r.status_code == 200
    assert r.json()["email"] == "admin@disaster.ai"


# ─── Dashboard ───────────────────────────────────────────────────────────────

def test_dashboard_summary():
    r = client.get("/dashboard/summary", headers=auth())
    assert r.status_code == 200
    data = r.json()
    assert "active_disasters" in data
    assert "total_affected" in data
    assert "total_available" in data


# ─── Disasters ───────────────────────────────────────────────────────────────

def test_list_disasters():
    r = client.get("/disasters/", headers=auth())
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_create_disaster():
    r = client.post("/disasters/", headers=auth(), json={
        "name": "Test Flood",
        "disaster_type": "Flood",
        "location": "Test City",
        "latitude": 12.0, "longitude": 77.0,
        "date": "2024-01-01",
        "status": "Active", "severity": "High",
        "affected_population": 5000,
        "infrastructure_damage": 50.0,
        "medical_emergencies": 100,
        "road_accessibility": 60.0,
        "duration_days": 2,
    })
    assert r.status_code == 201
    assert r.json()["name"] == "Test Flood"


def test_filter_disasters_by_status():
    r = client.get("/disasters/?status=Active", headers=auth())
    assert r.status_code == 200
    for d in r.json():
        assert d["status"] == "Active"


# ─── Resources ───────────────────────────────────────────────────────────────

def test_list_resources():
    r = client.get("/resources/", headers=auth())
    assert r.status_code == 200
    assert len(r.json()) >= 5


def test_create_resource():
    r = client.post("/resources/", headers=auth(), json={
        "name": "Test Water", "category": "Water",
        "unit": "liters", "quantity_available": 1000.0,
        "min_stock_level": 200.0
    })
    assert r.status_code == 201
    assert r.json()["name"] == "Test Water"


def test_stock_increase():
    # Get first resource
    resources = client.get("/resources/", headers=auth()).json()
    rid = resources[0]["id"]
    old_qty = resources[0]["quantity_available"]
    r = client.post(f"/resources/{rid}/stock", headers=auth(),
                    json={"action": "increase", "quantity": 100.0, "reason": "test"})
    assert r.status_code == 200
    assert r.json()["quantity_available"] == old_qty + 100.0


def test_stock_decrease():
    resources = client.get("/resources/", headers=auth()).json()
    rid = resources[0]["id"]
    r = client.post(f"/resources/{rid}/stock", headers=auth(),
                    json={"action": "decrease", "quantity": 50.0, "reason": "test"})
    assert r.status_code == 200


def test_stock_over_decrease():
    r = client.post("/resources/1/stock", headers=auth(),
                    json={"action": "decrease", "quantity": 9999999.0})
    assert r.status_code == 400


# ─── AI Predictions ──────────────────────────────────────────────────────────

def test_severity_prediction():
    r = client.post("/predictions/severity", headers=auth(), json={
        "disaster_type": "Flood",
        "affected_population": 50000,
        "rainfall": 300.0,
        "water_level": 6.0,
        "infrastructure_damage": 70.0,
        "medical_emergencies": 200,
        "road_accessibility": 30.0,
    })
    assert r.status_code == 200
    d = r.json()
    assert "severity_score" in d
    assert d["severity_category"] in ("Low", "Moderate", "High", "Critical")
    assert 0 <= d["severity_score"] <= 100


def test_resource_prediction():
    r = client.post("/predictions/resources", headers=auth(), json={
        "disaster_type": "Flood",
        "affected_population": 10000,
        "severity_category": "High",
        "duration_days": 3,
        "medical_emergencies": 150,
        "vulnerable_population": 2000,
    })
    assert r.status_code == 200
    d = r.json()
    assert "predictions" in d
    assert "food_packets" in d["predictions"]
    assert d["predictions"]["food_packets"] > 0


# ─── Allocation ──────────────────────────────────────────────────────────────

def test_predict_requirements():
    disasters = client.get("/disasters/", headers=auth()).json()
    did = disasters[0]["id"]
    r = client.post(f"/allocations/predict-requirements/{did}", headers=auth())
    # Either success (areas exist) or 400 (no areas for test disaster)
    assert r.status_code in (200, 400)


def test_optimize_allocation():
    # Use seeded disaster that has areas
    disasters = client.get("/disasters/?status=Active", headers=auth()).json()
    if disasters:
        did = disasters[0]["id"]
        areas = client.get(f"/areas/?disaster_id={did}", headers=auth()).json()
        if areas:
            r = client.post(f"/allocations/optimize/{did}", headers=auth())
            assert r.status_code == 200
            assert "allocations" in r.json()


def test_list_allocations():
    r = client.get("/allocations/", headers=auth())
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ─── Areas ───────────────────────────────────────────────────────────────────

def test_list_areas():
    r = client.get("/areas/", headers=auth())
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ─── Audit ───────────────────────────────────────────────────────────────────

def test_audit_logs():
    r = client.get("/audit/", headers=auth())
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_audit_analyst_denied():
    # Analyst shouldn't see audit logs
    r = client.post("/auth/login", json={"email": "analyst@disaster.ai", "password": "Analyst@123"})
    analyst_token = r.json()["access_token"]
    r2 = client.get("/audit/", headers={"Authorization": f"Bearer {analyst_token}"})
    assert r2.status_code == 403


# Cleanup test DB
def teardown_module(module):
    import os, gc, time
    gc.collect()          # release SQLAlchemy connection pool
    time.sleep(0.5)
    try:
        if os.path.exists("test_disaster.db"):
            os.remove("test_disaster.db")
    except PermissionError:
        pass  # Windows may still hold the file; safe to ignore
