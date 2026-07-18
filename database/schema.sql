-- database/schema.sql

PRAGMA journal_mode = WAL;  -- required: two processes read/write this file concurrently

CREATE TABLE nodes (
    id          TEXT PRIMARY KEY,
    type        TEXT NOT NULL CHECK(type IN ('equipment','fix','procedure')),
    name        TEXT NOT NULL,
    properties  TEXT NOT NULL DEFAULT '{}',   -- JSON: manufacturer, install_date, location...
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE edges (
    id                     TEXT PRIMARY KEY,
    source_id              TEXT NOT NULL REFERENCES nodes(id),
    target_id              TEXT NOT NULL REFERENCES nodes(id),
    relation_type          TEXT NOT NULL CHECK(relation_type IN ('connects_to','has_known_fix')),

    -- structural edges (relation_type = 'connects_to') use this:
    flow_direction         TEXT CHECK(flow_direction IN ('upstream','downstream') OR flow_direction IS NULL),

    -- experiential edges (relation_type = 'has_known_fix') use these:
    symptom_description    TEXT,
    telemetry_signature    TEXT DEFAULT '{}',   -- JSON: {"metric":"pressure","condition":"drop_pct>15"}
    positive_feedback      INTEGER NOT NULL DEFAULT 1,
    negative_feedback      INTEGER NOT NULL DEFAULT 0,
    confidence             REAL NOT NULL DEFAULT 0.0,  -- recomputed on every feedback write, never trust a stale value
    is_compliance_relevant INTEGER NOT NULL DEFAULT 0, -- 0/1, PESO/OISD-aligned flag

    source_excerpt          TEXT,               -- original text this was extracted from — auditability
    source_type              TEXT CHECK(source_type IN ('pid','shift_note','work_order','feedback')),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE feedback_log (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    edge_id        TEXT NOT NULL REFERENCES edges(id),
    technician_id  TEXT NOT NULL,
    outcome        TEXT NOT NULL CHECK(outcome IN ('confirmed','rejected')),
    note           TEXT,
    timestamp      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_edges_source   ON edges(source_id);
CREATE INDEX idx_edges_target   ON edges(target_id);
CREATE INDEX idx_edges_relation ON edges(relation_type);
CREATE INDEX idx_feedback_edge  ON feedback_log(edge_id);
