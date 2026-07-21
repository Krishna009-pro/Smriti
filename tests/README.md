# Smriti Test Suite

This directory contains test suites for **Smriti – Industrial Memory OS** across all components.

## Directory Structure
* `backend/`: REST API endpoint and service logic unit tests.
* `ai/`: Extraction engine and prompt logic unit tests.
* `frontend/`: Frontend components and visual UI unit tests.

## Running Tests

### Backend and AI Package
Make sure your Python virtual environment is active and pytest is installed:
```bash
cd backend
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Run pytest from the root folder
cd ..
pytest


# start from root folder
backend\.venv\Scripts\python -m uvicorn backend.main:app --port 8000 --reload

```

### Frontend Tests
If Vitest is configured:
```bash
cd frontend
npm run test
```
*(Configure testing libraries in `frontend/package.json` as the UI grows.)*
