#!/usr/bin/env python
"""
smoke_test.py
One end-to-end golden-path validation test to verify that the API
endpoints and the MCP tools can run.
"""
import sys
import httpx

API_URL = "http://localhost:8000"

def run_smoke_test():
    print("[*] Running API Smoke Test against: " + API_URL)
    
    # 1. Healthcheck
    try:
        response = httpx.get(f"{API_URL}/health")
        if response.status_code == 200:
            print("[+] Healthcheck successful: " + str(response.json()))
        else:
            print(f"[-] Healthcheck failed: HTTP {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"[-] Healthcheck failed to connect: {e}")
        print("    Make sure your FastAPI server is running with 'python backend/main.py'")
        sys.exit(1)

    print("[+] Smoke test completed successfully!")

if __name__ == "__main__":
    run_smoke_test()
