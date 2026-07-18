# Smriti Utility Scripts

This directory contains automation, setup, and verification scripts for the **Smriti – Industrial Memory OS** repository.

## Contents
* `reset_demo.py`: Python script to wipe out `database/smriti.db` and reseed it using the baseline schemas. Extremely useful for maintaining a repeatable presentation environment.
* `smoke_test.py`: Lightweight HTTP validation script that runs the baseline endpoints to verify the API server is functional.

## Execution
Make sure your Python virtual environment is active, then run:
```bash
# Reset database
python scripts/reset_demo.py

# Run API check (FastAPI must be running)
python scripts/smoke_test.py
```
