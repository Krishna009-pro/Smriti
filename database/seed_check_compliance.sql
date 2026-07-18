-- database/seed_check_compliance.sql
-- Seed data for testing compliance functionality

-- Nodes
INSERT OR IGNORE INTO nodes (id, type, name, properties) VALUES 
('P-102', 'equipment', 'Feed Pump P-102', '{"manufacturer": "Sulzer", "install_date": "2021-03-12"}'),
('FIX-102', 'fix', 'Replace pump seal and recalibrate telemetry', '{"part": "Silicon-Seal-V2", "estimated_hours": 2}'),
('PROC-OISD-118', 'procedure', 'OISD-GDN-118 Layout Standard', '{"regulatory_body": "OISD", "standard_id": "118"}');

-- Edges
INSERT OR IGNORE INTO edges (
    id, source_id, target_id, relation_type, symptom_description, 
    positive_feedback, negative_feedback, confidence, is_compliance_relevant, source_type
) VALUES 
('edge-has-fix-102', 'P-102', 'FIX-102', 'has_known_fix', 'Pump seal vibration threshold exceeded', 5, 0, 0.85, 1, 'shift_note');
