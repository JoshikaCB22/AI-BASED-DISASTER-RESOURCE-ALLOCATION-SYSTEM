"""
Seed database with demo data.
All data is fictional — for demonstration purposes only.
"""
from sqlalchemy.orm import Session
from app.models.models import User, Disaster, AffectedArea, Resource
from app.auth import hash_password
from app.ml.predictor import calc_priority


def seed_db(db: Session):
    # --- Users ---
    if db.query(User).count() == 0:
        users = [
            User(email="admin@disaster.ai",       full_name="System Admin",         hashed_password=hash_password("Admin@123"),       role="admin"),
            User(email="manager@disaster.ai",      full_name="District Manager",     hashed_password=hash_password("Manager@123"),     role="disaster_manager"),
            User(email="coordinator@disaster.ai",  full_name="Relief Coordinator",   hashed_password=hash_password("Coordinator@123"), role="relief_coordinator"),
            User(email="analyst@disaster.ai",      full_name="Data Analyst",         hashed_password=hash_password("Analyst@123"),     role="analyst"),
        ]
        db.add_all(users)
        db.commit()
        print("✓ Demo users seeded")

    # --- Resources ---
    if db.query(Resource).count() == 0:
        resources = [
            Resource(name="Food Packets",    category="Food",           unit="packets",  quantity_available=45000, min_stock_level=10000, supplier="NFC",        warehouse="Chennai Central"),
            Resource(name="Drinking Water",  category="Water",          unit="liters",   quantity_available=80000, min_stock_level=20000, supplier="MWB",        warehouse="Chennai Central"),
            Resource(name="Medicines",       category="Medical",        unit="units",    quantity_available=12000, min_stock_level=5000,  supplier="State Health", warehouse="Delhi North Hub"),
            Resource(name="Medical Kits",    category="Medical",        unit="kits",     quantity_available=2800,  min_stock_level=500,   supplier="Red Cross",  warehouse="Delhi North Hub"),
            Resource(name="Blankets",        category="Shelter",        unit="units",    quantity_available=11000, min_stock_level=3000,  supplier="Textiles",   warehouse="Mumbai West"),
            Resource(name="Tents",           category="Shelter",        unit="units",    quantity_available=2200,  min_stock_level=500,   supplier="Army Depot", warehouse="Mumbai West"),
            Resource(name="Sanitation Kits", category="Sanitation",     unit="kits",     quantity_available=7500,  min_stock_level=2000,  supplier="UNICEF",     warehouse="Kolkata East"),
            Resource(name="Rescue Boats",    category="Rescue Equip",   unit="boats",    quantity_available=80,    min_stock_level=20,    supplier="Coast Guard", warehouse="Chennai Central"),
            Resource(name="Ambulances",      category="Vehicles",       unit="vehicles", quantity_available=40,    min_stock_level=10,    supplier="Transport",  warehouse="Delhi North Hub"),
            Resource(name="Fuel (Diesel)",   category="Fuel",           unit="liters",   quantity_available=50000, min_stock_level=10000, supplier="IOC",        warehouse="Kolkata East"),
        ]
        for r in resources:
            if r.quantity_available == 0:
                r.status = "Out of Stock"
            elif r.quantity_available < r.min_stock_level:
                r.status = "Low Stock"
            else:
                r.status = "Available"
        db.add_all(resources)
        db.commit()
        print("✓ Resources seeded")

    # --- Disasters ---
    if db.query(Disaster).count() == 0:
        disasters_data = [
            dict(name="Kerala River Flood 2024",        disaster_type="Flood",
                 location="Ernakulam, Kerala",          latitude=10.016,  longitude=76.342,
                 date="2024-08-15", status="Active",    severity="Critical", severity_score=82.5,
                 affected_population=45000,             area_affected=320.5,
                 rainfall=380.0, water_level=7.2,       infrastructure_damage=65.0,
                 medical_emergencies=230,               road_accessibility=35.0, duration_days=4),
            dict(name="Cyclone Remal — Odisha Coast",   disaster_type="Cyclone",
                 location="Puri District, Odisha",      latitude=19.813,  longitude=85.831,
                 date="2024-05-26", status="Active",    severity="High",     severity_score=71.0,
                 affected_population=28000,             area_affected=180.0,
                 wind_speed=185.0, rainfall=210.0,      infrastructure_damage=55.0,
                 medical_emergencies=145,               road_accessibility=50.0, duration_days=2),
            dict(name="Uttarakhand Earthquake",         disaster_type="Earthquake",
                 location="Chamoli, Uttarakhand",       latitude=30.442,  longitude=79.309,
                 date="2024-02-08", status="Monitoring",severity="High",     severity_score=68.0,
                 affected_population=15000,             magnitude=6.2,
                 infrastructure_damage=72.0,            medical_emergencies=180,
                 road_accessibility=40.0, duration_days=1),
            dict(name="Sikkim Landslide",               disaster_type="Landslide",
                 location="East Sikkim",                latitude=27.339,  longitude=88.606,
                 date="2024-06-10", status="Active",    severity="Moderate", severity_score=42.0,
                 affected_population=8500,              rainfall=150.0,
                 infrastructure_damage=48.0,            medical_emergencies=55,
                 road_accessibility=25.0, duration_days=2),
            dict(name="Marathwada Drought",             disaster_type="Drought",
                 location="Aurangabad, Maharashtra",    latitude=19.876,  longitude=75.343,
                 date="2024-03-01", status="Monitoring",severity="Moderate", severity_score=38.5,
                 affected_population=125000,            area_affected=850.0,
                 rainfall=45.0,                         road_accessibility=90.0, duration_days=30),
        ]
        disasters = [Disaster(**d) for d in disasters_data]
        db.add_all(disasters)
        db.commit()
        print("✓ Disasters seeded")

    # --- Affected Areas ---
    if db.query(AffectedArea).count() == 0:
        disaster_map = {d.name: d for d in db.query(Disaster).all()}

        areas_raw = [
            # Kerala Flood
            dict(disaster_name="Kerala River Flood 2024",
                 name="Aluva Town",        district="Ernakulam", state="Kerala",
                 latitude=10.104, longitude=76.356,
                 affected_population=18000, vulnerable_population=4500,
                 infrastructure_damage=75.0, medical_emergencies=120, road_accessibility=25.0),
            dict(disaster_name="Kerala River Flood 2024",
                 name="Perumbavoor",       district="Ernakulam", state="Kerala",
                 latitude=10.107, longitude=76.468,
                 affected_population=12000, vulnerable_population=3200,
                 infrastructure_damage=60.0, medical_emergencies=65,  road_accessibility=40.0),
            dict(disaster_name="Kerala River Flood 2024",
                 name="Kalady Village",    district="Ernakulam", state="Kerala",
                 latitude=10.172, longitude=76.443,
                 affected_population=6000,  vulnerable_population=1800,
                 infrastructure_damage=40.0, medical_emergencies=30,  road_accessibility=55.0),
            # Cyclone
            dict(disaster_name="Cyclone Remal — Odisha Coast",
                 name="Puri Coastal Area", district="Puri",       state="Odisha",
                 latitude=19.813, longitude=85.831,
                 affected_population=10000, vulnerable_population=2800,
                 infrastructure_damage=70.0, medical_emergencies=85,  road_accessibility=45.0),
            dict(disaster_name="Cyclone Remal — Odisha Coast",
                 name="Konark Village",    district="Puri",       state="Odisha",
                 latitude=19.888, longitude=86.124,
                 affected_population=4000,  vulnerable_population=1200,
                 infrastructure_damage=45.0, medical_emergencies=40,  road_accessibility=60.0),
            # Earthquake
            dict(disaster_name="Uttarakhand Earthquake",
                 name="Joshimath Area",    district="Chamoli",    state="Uttarakhand",
                 latitude=30.557, longitude=79.564,
                 affected_population=5200,  vulnerable_population=1600,
                 infrastructure_damage=80.0, medical_emergencies=110, road_accessibility=30.0),
            # Landslide
            dict(disaster_name="Sikkim Landslide",
                 name="Gangtok Sub-area",  district="East Sikkim",state="Sikkim",
                 latitude=27.339, longitude=88.607,
                 affected_population=2800,  vulnerable_population=700,
                 infrastructure_damage=50.0, medical_emergencies=35,  road_accessibility=20.0),
            # Drought
            dict(disaster_name="Marathwada Drought",
                 name="Aurangabad Rural",  district="Aurangabad", state="Maharashtra",
                 latitude=19.876, longitude=75.343,
                 affected_population=45000, vulnerable_population=12000,
                 infrastructure_damage=10.0, medical_emergencies=25,  road_accessibility=90.0),
        ]

        for ar in areas_raw:
            d = disaster_map.get(ar.pop("disaster_name"))
            if not d:
                continue
            score, level = calc_priority(
                d.severity_score or 50,
                ar["affected_population"], ar["vulnerable_population"],
                ar["medical_emergencies"], ar["infrastructure_damage"], ar["road_accessibility"]
            )
            db.add(AffectedArea(**ar, disaster_id=d.id, priority_score=score, priority_level=level))
        db.commit()
        print("✓ Affected areas seeded")
