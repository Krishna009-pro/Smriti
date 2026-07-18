# Smriti Docker Configuration

This directory contains containerization files for building and deploying **Smriti – Industrial Memory OS** services.

## Contents
* `Dockerfile.backend`: Dockerfile for the FastAPI REST server and FastMCP environment.
* `Dockerfile.frontend`: Multi-stage Dockerfile for the Next.js frontend app.

## Running Smriti with Docker Compose
You can run the entire Smriti stack (frontend, backend, SQLite database volume mounts) with a single command from the project root:
```bash
docker-compose up --build
```
This maps:
* **Frontend Web UI**: [http://localhost:3000](http://localhost:3000)
* **Backend REST API**: [http://localhost:8000](http://localhost:8000)
* **SQLite Database**: Persisted locally in `database/smriti.db`.
