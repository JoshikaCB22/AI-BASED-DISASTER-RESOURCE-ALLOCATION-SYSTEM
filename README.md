# AI-Based Disaster Relief Resource Allocation System

A full-stack web application for intelligent disaster relief management.

---

## Tech Stack
- **Backend**: Python, FastAPI, SQLite, SQLAlchemy
- **Frontend**: React, Vite, Tailwind CSS, Recharts, Leaflet
- **AI/ML**: Rule-based prediction engine (no external APIs needed)

---

## Quick Start

### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API runs at: http://localhost:8000  
Docs at: http://localhost:8000/docs

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs at: http://localhost:5173

---

## Demo Credentials

| Role               | Email                      | Password         |
|--------------------|----------------------------|------------------|
| Admin              | admin@disaster.ai          | Admin@123        |
| Disaster Manager   | manager@disaster.ai        | Manager@123      |
| Relief Coordinator | coordinator@disaster.ai    | Coordinator@123  |
| Analyst            | analyst@disaster.ai        | Analyst@123      |

> These are demo credentials for a college project. Do NOT use in production.

---

## Features
- Dashboard with live charts
- Disaster CRUD with all parameters
- Affected area management with auto priority scoring
- Resource inventory with stock management
- AI Severity Prediction (rule-based, explainable)
- Resource Requirement Prediction
- Priority-Aware Allocation Optimization
- Approve / Reject workflow
- What-If Simulation
- Interactive Leaflet map
- CSV Report export
- Audit logs (admin only)
- User management (admin only)
- 21 automated backend tests

---

## Run Tests
```bash
cd backend
venv\Scripts\activate
pytest tests/test_api.py -v
```
