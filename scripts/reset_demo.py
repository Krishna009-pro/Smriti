import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.db.models import Base, User
from backend.auth.security import hash_password
from backend.services.ingestion_service import IngestionService
from alembic.config import Config
from alembic import command

DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database"))
DB_PATH = os.path.join(DB_DIR, "smriti.db")
DATABASE_URL = f"sqlite:///{DB_PATH}"

def reset_demo():
    print(f"[*] Resetting demo database at: {DB_PATH}")
    
    os.makedirs(DB_DIR, exist_ok=True)
    
    # 2. Connect engine and reset tables
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    try:
        # Drop all tables in case database already exists and is locked by uvicorn
        Base.metadata.drop_all(bind=engine)
        print("[+] Existing database tables dropped successfully.")
    except Exception as e:
        print(f"[!] Warning: Failed to drop tables (might be locked/missing): {e}")

    Base.metadata.create_all(bind=engine)
    print("[+] Database tables created successfully via SQLAlchemy metadata.")
    
    # 3. Stamp Alembic head programmatically
    try:
        alembic_cfg = Config(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "alembic.ini")))
        alembic_cfg.set_main_option("script_location", os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend", "alembic")))
        alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
        command.stamp(alembic_cfg, "head")
        print("[+] Alembic migration state stamped to head.")
    except Exception as e:
        print(f"[!] Warning: Failed to stamp Alembic head: {e}")
        
    # 4. Seed user personas via ORM
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        # Seed users
        tech_user = User(
            username="TECH-01",
            hashed_password=hash_password("password123"),
            role="technician"
        )
        eng_user = User(
            username="ENG-01",
            hashed_password=hash_password("password123"),
            role="engineer"
        )
        db.add(tech_user)
        db.add(eng_user)
        db.commit()
        print("[+] Seeded default user accounts (TECH-01, ENG-01).")
        
        # 5. Seed knowledge graph via IngestionService
        print("[*] Reseeding knowledge graph via Ingestion Service...")
        ingest = IngestionService(db)
        # Using cache fallbacks ensures offline success
        ingest.ingest_pid("pid_document.pdf", use_cache=True)
        ingest.ingest_shift_notes("shift_notes.txt", use_cache=True)
        print("[+] Knowledge graph seeded successfully.")
    except Exception as e:
        print(f"[-] Database seeding failed: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()
        
    print("[+] Smriti OS demo database reset and seed complete!")

if __name__ == "__main__":
    reset_demo()
