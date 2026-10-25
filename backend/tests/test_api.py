from fastapi.testclient import TestClient
from app.main import app
client = TestClient(app)
def test_health():
    r=client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"
def test_estimate():
    r=client.post("/api/planning/estimate", json={"built_up_area_sqft":1000,"rate_per_sqft_inr":2000,"market_multiplier":1.2,"completion_percent":25,"steel_kg_per_sqft":3,"cement_bags_per_sqft":0.4})
    assert r.status_code == 200
    assert r.json()["construction_budget_inr"] == 2000000
    assert r.json()["incurred_cost_estimate_inr"] == 500000
def test_rain_advisory():
    r=client.post("/api/advisory",json={"weather":"Heavy Rain"})
    assert r.status_code == 200 and r.json()["risk_level"] == "high"
