# Smriti Backend

This is the backend service for **Smriti – Industrial Memory OS**, built using FastAPI, SQLAlchemy, Alembic, and Pydantic.

## Getting Started

### Prerequisites
Make sure you have Python 3.11+ installed.

### Installation & Run

1. **Activate Virtual Environment**
   * **Windows:**
     ```bash
     .venv\Scripts\activate
     ```
   * **macOS/Linux:**
     ```bash
     source .venv/bin/activate
     ```

2. **Run FastAPI Server**
   ```bash
   python main.py
   ```
   The API will be available at `http://localhost:8000`. You can access the interactive Swagger documentation at `http://localhost:8000/docs`.

3. **Running the FastMCP Server**
   You can run the MCP server in stdio mode:
   ```bash
   python mcp_server.py
   ```

### Database Migrations (Alembic)
To generate a new migration revision:
```bash
alembic revision --autogenerate -m "description_of_migration"
```

To run migrations:
```bash
alembic upgrade head
```
