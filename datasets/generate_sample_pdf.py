"""Generate a valid, structured vector PDF for sample_pid.pdf using ReportLab."""
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Spacer
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class SchematicCanvas(canvas.Canvas):
    def draw_schematic(self):
        # Draw background border
        self.setStrokeColor(colors.HexColor('#1E3A8A'))
        self.setLineWidth(2)
        self.rect(20, 20, 572, 752)
        
        # Draw title header
        self.setFont("Helvetica-Bold", 16)
        self.setFillColor(colors.HexColor('#1E3A8A'))
        self.drawString(40, 720, "P&ID SCHEMATIC: FEED PUMP LOOP")
        
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor('#4B5563'))
        self.drawString(40, 705, "Smriti Refinery Operations | Isometric Layout P-102")
        
        # Draw VLV-102a Box (Control Valve)
        self.setStrokeColor(colors.HexColor('#0F766E'))
        self.setFillColor(colors.HexColor('#F0FDFA'))
        self.rect(60, 400, 100, 50, fill=True)
        self.setFillColor(colors.HexColor('#0F766E'))
        self.setFont("Helvetica-Bold", 12)
        self.drawCentredString(110, 425, "VLV-102a")
        self.setFont("Helvetica", 8)
        self.drawCentredString(110, 410, "Control Valve")
        
        # Draw flow line 1
        self.setStrokeColor(colors.HexColor('#4B5563'))
        self.setLineWidth(1.5)
        self.line(160, 425, 240, 425)
        # Arrow
        self.line(235, 420, 240, 425)
        self.line(235, 430, 240, 425)
        
        # Draw P-101A Box (Feed Pump)
        self.setStrokeColor(colors.HexColor('#1E3A8A'))
        self.setFillColor(colors.HexColor('#EFF6FF'))
        self.rect(240, 400, 100, 50, fill=True)
        self.setFillColor(colors.HexColor('#1E3A8A'))
        self.setFont("Helvetica-Bold", 12)
        self.drawCentredString(290, 425, "P-101A")
        self.setFont("Helvetica", 8)
        self.drawCentredString(290, 410, "Feed Pump")
        
        # Draw flow line 2
        self.setStrokeColor(colors.HexColor('#4B5563'))
        self.line(340, 425, 420, 425)
        # Arrow
        self.line(415, 420, 420, 425)
        self.line(415, 430, 420, 425)
        
        # Draw V-101 Box (Outlet Valve)
        self.setStrokeColor(colors.HexColor('#B91C1C'))
        self.setFillColor(colors.HexColor('#FEF2F2'))
        self.rect(420, 400, 100, 50, fill=True)
        self.setFillColor(colors.HexColor('#B91C1C'))
        self.setFont("Helvetica-Bold", 12)
        self.drawCentredString(470, 425, "V-101")
        self.setFont("Helvetica", 8)
        self.drawCentredString(470, 410, "Outlet Valve")
        
        # Draw Legend
        self.setFont("Helvetica-Bold", 10)
        self.setFillColor(colors.HexColor('#1F2937'))
        self.drawString(60, 120, "Legend:")
        self.setFont("Helvetica", 8)
        self.drawString(60, 105, "-->  Process Flow Direction")
        self.drawString(60, 90, "VLV-102a: Inlet upstream control valve (Normally Open)")
        self.drawString(60, 75, "P-101A: Secondary Centrifugal Feed Pump")
        self.drawString(60, 60, "V-101: Outlet safety isolation valve")

def build_pdf(filename):
    doc = SimpleDocTemplate(filename, pagesize=letter)
    story = [Spacer(1, 10)]
    
    def on_page(canvas_obj, doc_obj):
        # Cast to custom SchematicCanvas
        canvas_obj.__class__ = SchematicCanvas
        canvas_obj.draw_schematic()
        
    doc.build(story, onFirstPage=on_page)

if __name__ == "__main__":
    build_pdf("datasets/sample_pid.pdf")
    print("PDF generated successfully.")
