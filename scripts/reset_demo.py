#!/usr/bin/env python
"""
reset_demo.py
Utility script to wipe and reseed the SQLite database for a repeatable demo.
"""
import os
import sqlite3
import sys

# Define database file path
DB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database"))
DB_PATH = os.path.join(DB_DIR, "smriti.db")
SCHEMA_PATH = os.path.join(DB_DIR, "schema.sql")
SEED_PATH = os.path.join(DB_DIR, "seed_check_compliance.sql")

def reset_database():
    print(f"[*] Resetting database at: {DB_PATH}")
    
    # 1. Wipe database if it exists
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
            print("[+] Old database file removed.")
        except Exception as e:
            print(f"[-] Error removing old database: {e}")
            sys.exit(1)
            
    # Ensure database folder exists
    os.makedirs(DB_DIR, exist_ok=True)
    
    # 2. Connect and execute schema
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Load schema
        with open(SCHEMA_PATH, "r") as f:
            schema_sql = f.read()
        cursor.executescript(schema_sql)
        print("[+] Schema applied successfully.")
        
        # Load seed data
        if os.path.exists(SEED_PATH):
            with open(SEED_PATH, "r") as f:
                seed_sql = f.read()
            cursor.executescript(seed_sql)
            print("[+] Compliance seed data applied successfully.")
        else:
            print("[!] Seed file not found, skipping seeding.")
            
        conn.commit()
        conn.close()
        print("[+] Database successfully reset and initialized.")
    except Exception as e:
        print(f"[-] Database initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    reset_database()
