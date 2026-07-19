#!/usr/bin/env python
"""
smoke_test.py
Comprehensive end-to-end smoke test validating all REST API golden paths.
"""
import os
import sys
import httpx

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scripts.reset_demo import reset_demo

API_URL = "http://localhost:8000"

def run_smoke_test():
    print("[*] 1. Resetting database to a clean, seeded state...")
    reset_demo()
    
    print("\n[*] 2. Starting API Smoke Test against: " + API_URL)
    client = httpx.Client(base_url=API_URL, timeout=20.0)

    # A. Healthcheck
    try:
        response = client.get("/health")
        if response.status_code == 200:
            print("[+] Healthcheck successful: " + str(response.json()))
        else:
            print(f"[-] Healthcheck failed: HTTP {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"[-] Failed to connect to FastAPI: {e}")
        print("    Ensure the backend is running with 'python backend/main.py'")
        sys.exit(1)

    # B. Dashboard Metrics
    response = client.get("/api/dashboard/metrics")
    assert response.status_code == 200
    metrics = response.json()
    print("[+] Dashboard Metrics:", metrics)
    assert "context_retained_pct" in metrics
    assert "expert_dependency_score" in metrics
    assert "compliance_flags_count" in metrics

    # C. Trace Topology for P-102
    response = client.get("/api/trace/P-102")
    assert response.status_code == 200
    trace = response.json()
    print(f"[+] Traced {len(trace['nodes'])} nodes and {len(trace['edges'])} edges for P-102.")
    assert len(trace["nodes"]) > 0
    assert len(trace["edges"]) > 0

    # D. Submit Feedback (Upvote FIX-102 on P-102)
    # Find the edge connecting P-102 to FIX-102
    edge_id = None
    for edge in trace["edges"]:
        if edge["source_id"] == "P-102" and edge["relation_type"] == "has_known_fix":
            edge_id = edge["id"]
            break

    if edge_id:
        print(f"[*] Submitting upvote feedback on edge: {edge_id}")
        response = client.post(
            "/api/feedback",
            json={
                "edge_id": edge_id,
                "technician_id": "TECH-01",  # Matches seeded TECH-01 user username
                "outcome": "confirmed",
                "note": "Validated in smoke test"
            }
        )
        assert response.status_code == 200
        res_data = response.json()
        print("[+] Feedback result:", res_data)
        assert res_data["outcome"] == "confirmed"
    else:
        print("[-] Warning: FIX-102 edge not found to test feedback.")
        sys.exit(1)

    # E. Telemetry Anomaly Simulation
    print("[*] Simulating pressure drop anomaly on P-102...")
    response = client.post(
        "/api/telemetry/simulate",
        json={
            "equipment_id": "P-102",
            "metric": "pressure",
            "value": 65.0,
            "delta_pct": 18.5
        }
    )
    assert response.status_code == 200
    sim_data = response.json()
    print("[+] Simulation triggered:", sim_data)
    assert sim_data["status"] == "triggered"
    assert sim_data["alert_sent"] is True

    print("\n[+] All Smriti OS golden-path validations completed successfully!")

if __name__ == "__main__":
    run_smoke_test()
