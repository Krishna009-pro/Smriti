# Smriti Database

This directory contains the database definition schema, raw SQL migration commands, and seeding scripts for **Smriti – Industrial Memory OS**.

## Contents
* `schema.sql`: Initial SQLite schema structure (Nodes, Edges, Feedback Log).
* `seed_check_compliance.sql`: Baseline data for testing compliance-flag tagging and retrieval.

## Setup & Reseeding
To initialize the SQLite database locally using these files, you can run:
```bash
sqlite3 database/smriti.db < database/schema.sql
sqlite3 database/smriti.db < database/seed_check_compliance.sql
```
For python-managed setup and demo reset, see the utilities in the `scripts/` directory.
