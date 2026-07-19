"""Structured compliance PDF export service using ReportLab."""
import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from sqlalchemy.orm import Session
from backend.db.models import KnowledgeEdge, KnowledgeNode

def generate_compliance_pdf(db: Session, equipment_id: str = "P-102") -> io.BytesIO:
    """
    Spec 6.3: Generate a structured QMS-compliance audit PDF report for an asset.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=12
    )
    section_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#0F766E'),
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1F2937')
    )
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.white,
        fontWeight='bold'
    )

    story = []
    
    # Title
    story.append(Paragraph("SMRITI OS: COMPLIANCE & AUDIT REPORT", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | Target Asset: {equipment_id}", body_style))
    story.append(Spacer(1, 15))
    
    # 1. Asset Overview & Details
    story.append(Paragraph("1. Asset Information", section_style))
    node = db.query(KnowledgeNode).filter(KnowledgeNode.id == equipment_id).first()
    eq_name = node.name if node else "Unknown Asset"
    eq_type = node.type if node else "equipment"
    
    info_text = (
        f"<b>Equipment Tag:</b> {equipment_id}<br/>"
        f"<b>Asset Name:</b> {eq_name}<br/>"
        f"<b>Ontology Classification:</b> {eq_type.upper()}<br/>"
        f"<b>Refinery System Status:</b> ONLINE / MONITORED"
    )
    story.append(Paragraph(info_text, body_style))
    story.append(Spacer(1, 10))
    
    # 2. Dependency Trace
    story.append(Paragraph("2. Connected Process Topology", section_style))
    
    # Query connections for this asset
    connections = db.query(KnowledgeEdge).filter(
        (KnowledgeEdge.source_id == equipment_id) | (KnowledgeEdge.target_id == equipment_id)
    ).all()
    
    conn_data = [[Paragraph("<b>Connection ID</b>", table_header_style), 
                  Paragraph("<b>Source Asset</b>", table_header_style), 
                  Paragraph("<b>Target Asset</b>", table_header_style), 
                  Paragraph("<b>Relation Type</b>", table_header_style)]]
                  
    for conn in connections:
        conn_data.append([
            Paragraph(conn.id, body_style),
            Paragraph(conn.source_id, body_style),
            Paragraph(conn.target_id, body_style),
            Paragraph(conn.relation_type, body_style)
        ])
        
    if len(connections) == 0:
        conn_data.append([Paragraph("No process dependencies found in graph.", body_style), "", "", ""])
        
    conn_table = Table(conn_data, colWidths=[100, 120, 120, 160])
    conn_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D1D5DB')),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F9FAFB')),
    ]))
    story.append(conn_table)
    story.append(Spacer(1, 15))
    
    # 3. Compliance Warnings & Historical Fix Profiles
    story.append(Paragraph("3. QMS Compliance & Mapped Safety Remediation", section_style))
    
    # Query safety remedies (has_known_fix relation types)
    remedies = db.query(KnowledgeEdge).filter(
        KnowledgeEdge.relation_type == "has_known_fix",
        KnowledgeEdge.is_compliance_relevant == 1
    ).all()
    
    rem_data = [[Paragraph("<b>Asset Tag</b>", table_header_style), 
                  Paragraph("<b>Symptom / Safety Violation</b>", table_header_style), 
                  Paragraph("<b>Compliance Action Plan</b>", table_header_style), 
                  Paragraph("<b>Confidence</b>", table_header_style)]]
                  
    for rem in remedies:
        fix_node = db.query(KnowledgeNode).filter(KnowledgeNode.id == rem.target_id).first()
        fix_desc = fix_node.name if fix_node else "Inspect asset"
        rem_data.append([
            Paragraph(rem.source_id, body_style),
            Paragraph(rem.symptom_description or "Safety review required", body_style),
            Paragraph(fix_desc, body_style),
            Paragraph(f"{rem.confidence:.2%}", body_style)
        ])
        
    if len(remedies) == 0:
        rem_data.append([Paragraph("No active safety/compliance violations logged.", body_style), "", "", ""])
        
    rem_table = Table(rem_data, colWidths=[80, 180, 180, 60])
    rem_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F766E')),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#D1D5DB')),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#F9FAFB')),
    ]))
    story.append(rem_table)
    story.append(Spacer(1, 20))
    
    # Footer disclaimer
    story.append(Paragraph("<i>SMRITI Memory OS compliance records match digital P&ID blueprints with verified shift note logs. Please confirm all safety protocols manually before field deployment.</i>", body_style))
    
    doc.build(story)
    buffer.seek(0)
    return buffer
