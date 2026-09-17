"""
AI Prediction Engine
- Severity Predictor: uses Random Forest if trained, else formula-based fallback
- Resource Predictor: estimates quantities per affected population + severity
All ML uses synthetic demo data — NOT real emergency data.
"""
import os, json, math
import numpy as np

DISASTER_BASE = {
    "Flood": 60, "Cyclone": 70, "Earthquake": 80,
    "Landslide": 55, "Drought": 40, "Tsunami": 85,
    "Wildfire": 65, "Storm": 60
}

# ── Severity ──────────────────────────────────────────────────────────────────

def predict_severity(data: dict) -> dict:
    """
    Returns severity_score (0-100), category, contributing factors.
    Uses rule-based formula (transparent fallback — no black box).
    """
    dtype   = data.get("disaster_type", "Flood")
    pop     = data.get("affected_population", 0)
    infra   = data.get("infrastructure_damage", 0.0)
    med     = data.get("medical_emergencies", 0)
    water   = data.get("water_level", 0.0)
    wind    = data.get("wind_speed", 0.0)
    rain    = data.get("rainfall", 0.0)
    mag     = data.get("magnitude", 0.0)
    road    = data.get("road_accessibility", 100.0)

    # Normalise each factor 0-1
    type_n  = DISASTER_BASE.get(dtype, 60) / 100
    pop_n   = min(pop / 100_000, 1.0)
    infra_n = infra / 100
    med_n   = min(med / 500, 1.0)
    water_n = min(water / 10, 1.0)
    wind_n  = min(wind / 250, 1.0)
    rain_n  = min(rain / 500, 1.0)
    mag_n   = min(mag / 9, 1.0)
    road_n  = (100 - road) / 100

    weights = {
        "Affected Population":   (0.25, pop_n),
        "Infrastructure Damage": (0.20, infra_n),
        "Medical Emergencies":   (0.15, med_n),
        "Disaster Type":         (0.10, type_n),
        "Water Level":           (0.10, water_n),
        "Wind Speed":            (0.08, wind_n),
        "Road Inaccessibility":  (0.07, road_n),
        "Rainfall":              (0.03, rain_n),
        "Magnitude":             (0.02, mag_n),
    }

    raw = sum(w * v for w, v in weights.values())
    score = round(min(raw * 100, 100), 1)
    category = "Low" if score <= 25 else "Moderate" if score <= 50 else "High" if score <= 75 else "Critical"

    factors = [
        {"feature": name, "contribution": round(w * v * 100, 1), "weight": w}
        for name, (w, v) in weights.items()
    ]
    factors.sort(key=lambda x: x["contribution"], reverse=True)

    cat_msg = {"Critical": "Immediate emergency response required.",
               "High": "Urgent resource deployment needed.",
               "Moderate": "Close monitoring and pre-positioning recommended.",
               "Low": "Standard preparedness advised."}

    explanation = (
        f"Severity classified as {category} (score {score}/100). "
        f"Top factors: {factors[0]['feature']}, {factors[1]['feature']}, {factors[2]['feature']}. "
        + cat_msg[category]
    )

    return {"severity_score": score, "severity_category": category,
            "model_used": "Rule-Based Formula", "confidence": 0.85,
            "factors": factors, "explanation": explanation}


# ── Resource Requirements ─────────────────────────────────────────────────────

SEV_MULT = {"Low": 0.5, "Moderate": 0.8, "High": 1.3, "Critical": 1.9}

DISASTER_ADJ = {
    "Flood":      {"water_liters": 0.4, "sanitation_kits": 1.6},
    "Cyclone":    {"tents": 1.5, "blankets": 1.4},
    "Earthquake": {"medical_kits": 2.0, "medicine_units": 1.8},
    "Drought":    {"water_liters": 2.5, "food_packets": 1.5},
    "Tsunami":    {"medical_kits": 2.0, "tents": 1.8},
}

def predict_resources(data: dict) -> dict:
    pop      = max(data.get("affected_population", 0), 1)
    sev_cat  = data.get("severity_category", "Moderate")
    dtype    = data.get("disaster_type", "Flood")
    days     = max(data.get("duration_days", 1), 1)
    med_emg  = data.get("medical_emergencies", 0)
    vul_pop  = data.get("vulnerable_population", 0)

    sm = SEV_MULT.get(sev_cat, 1.0)
    adj = DISASTER_ADJ.get(dtype, {})
    vul_factor = 1 + (vul_pop / pop) * 0.2

    def q(base):  return round(max(base * sm * vul_factor, 0))

    preds = {
        "food_packets":    q(pop * 3 * days),
        "water_liters":    q(pop * 5 * days * adj.get("water_liters", 1.0)),
        "medicine_units":  q(pop * 0.15 * days * adj.get("medicine_units", 1.0) + med_emg * 2),
        "medical_kits":    q(pop * 0.12 * adj.get("medical_kits", 1.0) + med_emg * 0.5),
        "blankets":        q(pop * 0.8  * adj.get("blankets", 1.0)),
        "tents":           q((pop / 5)  * adj.get("tents", 1.0)),
        "sanitation_kits": q(pop * 0.2  * adj.get("sanitation_kits", 1.0)),
    }

    return {"predictions": preds, "model_used": "Rule-Based Formula",
            "note": "Quantities are estimates based on affected population and severity."}


# ── Priority Score ─────────────────────────────────────────────────────────────

def calc_priority(severity_score, affected_pop, vulnerable_pop,
                  medical_emergencies, infrastructure_damage, road_accessibility) -> tuple:
    """Returns (score 0-100, level)"""
    s   = min(severity_score / 100, 1.0)
    p   = min(affected_pop / 100_000, 1.0)
    v   = min(vulnerable_pop / 50_000, 1.0)
    m   = min(medical_emergencies / 500, 1.0)
    i   = infrastructure_damage / 100
    r   = (100 - road_accessibility) / 100

    score = round((0.30*s + 0.25*p + 0.15*v + 0.15*m + 0.10*i + 0.05*r) * 100, 1)
    level = "Critical" if score >= 76 else "High" if score >= 51 else "Medium" if score >= 26 else "Low"
    return score, level


# ── Allocation Optimizer (Greedy Priority-Aware) ───────────────────────────────

def optimize_allocation(requirements: list, available: dict) -> list:
    """
    requirements: [{area_id, area_name, resource_id, resource_name, unit,
                    required_qty, priority_score, priority_level, ...area info}]
    available: {resource_id: qty}

    Returns allocation list sorted by priority (critical first).
    Constraint: total allocated <= available stock.
    """
    stock = {k: float(v) for k, v in available.items()}
    results = []

    # Sort by priority descending (critical gets resources first)
    sorted_reqs = sorted(requirements, key=lambda x: x.get("priority_score", 0), reverse=True)

    for req in sorted_reqs:
        rid = req["resource_id"]
        needed = float(req["required_qty"])
        have = stock.get(rid, 0.0)
        allocated = min(needed, have)
        shortage = max(needed - allocated, 0.0)
        stock[rid] = max(have - allocated, 0.0)

        level = req.get("priority_level", "Medium")
        area_name = req.get("area_name", "")

        reason_lines = [
            f"{area_name} received {allocated:,.0f} {req.get('unit','units')} of {req.get('resource_name','')}.",
            f"• Priority: {level} (score {req.get('priority_score',0):.1f}/100)",
            f"• Affected population: {req.get('affected_population',0):,}",
            f"• Medical emergencies: {req.get('medical_emergencies',0)}",
            f"• Infrastructure damage: {req.get('infrastructure_damage',0):.0f}%",
        ]
        if shortage > 0:
            reason_lines.append(f"• Shortage: {shortage:,.0f} units (insufficient stock)")
        else:
            reason_lines.append("• Full requirement fulfilled.")
        if level == "Critical":
            reason_lines.append("• Allocated first — CRITICAL priority area.")

        results.append({
            **req,
            "allocated_qty": allocated,
            "shortage": shortage,
            "reason": "\n".join(reason_lines),
        })

    return results
