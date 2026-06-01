import uvicorn
import httpx
import base64
import json
import asyncio
import uuid
import io
import re
import os
import logging
import requests
import xml.sax.saxutils as saxutils
import smtplib
from email.message import EmailMessage
from openai import AsyncOpenAI

from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=env_path)

print(f'[ SYSTEM ] Master Vault Found: {os.path.exists(env_path)}')
print(f'[ SYSTEM ] Gmail User Loaded: {bool(os.getenv("GMAIL_SENDER"))}')
print(f'[ SYSTEM ] Gmail App Pass Loaded: {bool(os.getenv("GMAIL_APP_PASSWORD"))}')
print(f'[ SYSTEM ] OpenAI Core Loaded: {bool(os.getenv("OPENAI_API_KEY"))}')

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# --- THE DOCUMENT TRANSLATORS ---
import PyPDF2
import docx
from docx.shared import Inches, RGBColor, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import openpyxl
from reportlab.lib.pagesizes import LETTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.platypus import Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from PIL import Image

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, FileResponse
from typing import List, Optional
from datetime import datetime

# Local Imports
from .config import (
    OPENROUTER_API_KEY, 
    TIERS, 
    OPENROUTER_API_URL,
    MAX_TOKENS,
    TEMPERATURE
)
from . import storage 

app = FastAPI(title="LLM Council - Intelligence Collective")

def download_and_cache_image(openai_url):
    try:
        filename = f"dalle_{uuid.uuid4().hex[:8]}.png"
        save_dir = os.path.join(os.getcwd(), "static", "assets")
        os.makedirs(save_dir, exist_ok=True)
        filepath = os.path.join(save_dir, filename)
        response = requests.get(openai_url, stream=True)
        response.raise_for_status()
        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return f"http://localhost:5000/static/assets/{filename}"
    except Exception as e:
        print(f"IMAGE_INTERCEPT_FAILED: {e}")
        return openai_url

# --- CORS SECURITY PROTOCOL ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

assets_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend_build", "assets")
os.makedirs(assets_dir, exist_ok=True)
app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("council_api")

# --- RETROSPECTIVE ONE-TIME MIGRATION ---
@app.on_event("startup")
async def migrate_legacy_titles():
    async def migrate():
        await asyncio.sleep(2.0)  # Let the server startup settle
        print("[ SYSTEM MIGRATION ] Scanning for legacy conversations with 'New Conversation' titles...")
        try:
            convs = storage.list_conversations()
            updated_count = 0
            for c in convs:
                if c.get("title") in ["New Conversation", "NEW DELIBERATION", "NEW_DELIBERATION"]:
                    details = storage.get_conversation(c["id"])
                    if details and details.get("messages"):
                        first_user_msg = next((m for m in details["messages"] if m.get("role") == "user"), None)
                        if first_user_msg and first_user_msg.get("content"):
                            prompt_text = first_user_msg["content"].split("\n\n[ OVERRIDE:")[0]
                            words = [w.strip(".,!?;:()\"'[]{}") for w in prompt_text.split()]
                            words = [w.upper() for w in words if w]
                            new_title = " ".join(words[:4]) if words else "UNTITLED_ARCHIVE"
                            
                            storage.update_conversation_title(c["id"], new_title)
                            updated_count += 1
            if updated_count > 0:
                print(f"[ SYSTEM MIGRATION ] Success! Retrospectively auto-titled {updated_count} legacy archives.")
            else:
                print("[ SYSTEM MIGRATION ] Completed. No legacy archives required migration.")
        except Exception as e:
            print(f"[ SYSTEM MIGRATION ] Error during title migration: {e}")

    asyncio.create_task(migrate())

VISION_MODELS = ["claude", "gemini", "gpt", "grok", "o1", "o3", "pixtral", "vision", "deepseek", "mistral", "qwen"]

def compress_image(file_bytes: bytes, max_size=(800, 800)) -> str:
    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        logger.error(f"Image Compression Alert: {e}")
        return base64.b64encode(file_bytes).decode('utf-8')

def extract_document_text(file_bytes: bytes, filename: str) -> str:
    ext = filename.lower().split('.')[-1]
    text_content = ""
    try:
        if ext == 'pdf':
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for page in pdf_reader.pages:
                text_content += page.extract_text() + "\n"
        elif ext in ['xls', 'xlsx']:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            for sheet in wb.worksheets:
                text_content += f"\n--- SHEET: {sheet.title} ---\n"
                for row in sheet.iter_rows(values_only=True):
                    row_data = [str(cell) for cell in row if cell is not None]
                    if row_data:
                        text_content += " | ".join(row_data) + "\n"
        elif ext in ['doc', 'docx']:
            doc = docx.Document(io.BytesIO(file_bytes))
            for para in doc.paragraphs:
                text_content += para.text + "\n"
        return text_content.strip()
    except Exception as e:
        return f"[Error extracting text: {str(e)}]"

# --- PDF PAGE NUMBER GENERATOR (PAGE X OF Y) ---
class PageNumCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        canvas.Canvas.__init__(self, *args, **kwargs)
        self.pages = []
        
    def showPage(self):
        self.pages.append(dict(self.__dict__))
        self._startPage()
        
    def save(self):
        page_count = len(self.pages)
        for page in self.pages:
            self.__dict__.update(page)
            self.draw_page_number(page_count)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)
        
    def draw_page_number(self, page_count):
        if self._pageNumber == 1:
            w, h = LETTER
            # Draw gorgeous physical manila cardstock background on Cover Page (Page 1)
            self.setFillColor(colors.HexColor('#f5eedc')) # Premium manila folder cream/tan
            self.rect(0, 0, w, h, fill=True, stroke=False)
            
            # Distressed red double rounded border
            self.setStrokeColor(colors.HexColor('#cc3333'))
            self.setLineWidth(3)
            self.roundRect(28, 28, w - 56, h - 56, 12, fill=False, stroke=True)
            
            self.setLineWidth(1)
            self.roundRect(34, 34, w - 68, h - 68, 9, fill=False, stroke=True)
            
            # Top-Left metadata: No and Name fields resembling real file folder tags
            self.setFont("Courier-Bold", 10)
            self.setFillColor(colors.HexColor('#111827'))
            session_title = getattr(self._doctemplate, 'session_title', 'UNNAMED_SESSION')
            import hashlib
            case_hash = hashlib.md5(session_title.encode('utf-8')).hexdigest()[:8].upper()
            self.drawString(55, h - 75, f"No:   SECURE_KEY_{case_hash}")
            self.drawString(55, h - 90, f"Name: FOR YOUR EYE'S ONLY")
            
            # Bottom corners regulatory reference codes
            self.setFont("Courier-Bold", 8)
            self.setFillColor(colors.HexColor('#111827'))
            self.drawString(55, 52, "FORM-104 // CLASSIFIED SECURITY DIRECTIVE")
            self.drawRightString(w - 55, 52, "NSN 7540-01-213-7901")
        else:
            self.setFont("Helvetica-Bold", 9)
            self.setFillColorRGB(0.5, 0.5, 0.5)
            self.drawRightString(LETTER[0] - 72, 36, f"PAGE {self._pageNumber} OF {page_count}")


# --- DOCX PAGE NUMBER GENERATOR (PAGE X OF Y) ---
def add_page_numbers_to_docx(doc):
    for section in doc.sections:
        footer = section.footer
        p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        
        run1 = p.add_run("PAGE ")
        run1.font.size = Pt(9)
        run1.font.color.rgb = RGBColor(128, 128, 128)
        
        fldChar1 = OxmlElement('w:fldChar')
        fldChar1.set(qn('w:fldCharType'), 'begin')
        instrText1 = OxmlElement('w:instrText')
        instrText1.set(qn('xml:space'), 'preserve')
        instrText1.text = "PAGE"
        fldChar2 = OxmlElement('w:fldChar')
        fldChar2.set(qn('w:fldCharType'), 'separate')
        fldChar3 = OxmlElement('w:fldChar')
        fldChar3.set(qn('w:fldCharType'), 'end')
        
        run1._r.append(fldChar1)
        run1._r.append(instrText1)
        run1._r.append(fldChar2)
        run1._r.append(fldChar3)
        
        run2 = p.add_run(" OF ")
        run2.font.size = Pt(9)
        run2.font.color.rgb = RGBColor(128, 128, 128)
        
        fldChar4 = OxmlElement('w:fldChar')
        fldChar4.set(qn('w:fldCharType'), 'begin')
        instrText2 = OxmlElement('w:instrText')
        instrText2.set(qn('xml:space'), 'preserve')
        instrText2.text = "NUMPAGES"
        fldChar5 = OxmlElement('w:fldChar')
        fldChar5.set(qn('w:fldCharType'), 'separate')
        fldChar6 = OxmlElement('w:fldChar')
        fldChar6.set(qn('w:fldCharType'), 'end')
        
        run2._r.append(fldChar4)
        run2._r.append(instrText2)
        run2._r.append(fldChar5)
        run2._r.append(fldChar6)


def parse_dossier_elements(messages):
    """Slices the JSON into discrete rendering blocks for formatting."""
    elements = []
    for msg in messages:
        if msg.get('role') == 'user':
            elements.append({'type': 'user_header', 'content': '/// UPLINK INITIATED: USER OVERRIDE'})
            elements.append({'type': 'user_body', 'content': msg.get('content', '')})
        elif msg.get('role') == 'assistant':
            if 'stage1' in msg and isinstance(msg['stage1'], list):
                for item in msg['stage1']:
                    model = item.get('model', 'UNKNOWN MODEL').upper()
                    elements.append({'type': 'stage1_header', 'content': f'STAGE 1 — {model}'})
                    elements.append({'type': 'body', 'content': item.get('response', '')})
                    
            if 'stage2' in msg and isinstance(msg['stage2'], list):
                for item in msg['stage2']:
                    model = item.get('model', 'UNKNOWN MODEL').upper()
                    elements.append({'type': 'stage2_header', 'content': f'STAGE 2 — PEER REVIEW: {model}'})
                    elements.append({'type': 'body', 'content': item.get('response', '')})
                    
            if 'stage3' in msg:
                elements.append({'type': 'arbiter_header', 'content': "STAGE 3 — THE ARBITER'S JUDGEMENT"})
                resp = msg['stage3']
                if isinstance(resp, dict):
                    resp = resp.get('response', '')
                
                suggestion_split = re.split(r'(?is)(SUGGESTED PROMPT IMPROVEMENT:.*)', resp, maxsplit=1)
                main_resp = suggestion_split[0]
                suggestion_text = suggestion_split[1] if len(suggestion_split) > 1 else ""
                
                img_pattern = r"<img[^>]*src=['\"]([^'\"]+)['\"][^>]*>"
                parts = re.split(img_pattern, main_resp)
                
                elements.append({'type': 'body', 'content': parts[0]})
                for i in range(1, len(parts), 2):
                    elements.append({'type': 'image', 'url': parts[i]})
                    if i+1 < len(parts):
                        elements.append({'type': 'body', 'content': parts[i+1]})
                        
                if suggestion_text:
                    elements.append({'type': 'suggestion_block', 'content': suggestion_text})
                    
    return elements

def clean_body_text(text: str) -> str:
    if text is None:
        return ""
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'^### (.*)', r'\1', text, flags=re.MULTILINE)
    text = re.sub(r'^## (.*)', r'\1', text, flags=re.MULTILINE)
    text = re.sub(r'^# (.*)', r'\1', text, flags=re.MULTILINE)
    return text.strip()

def generate_docx_in_memory(title, tier, date_str, elements, logo_path):
    doc = docx.Document()
    add_page_numbers_to_docx(doc)
    
    doc.add_paragraph() 
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_sub = p_sub.add_run("COUNCIL_LOG")
    run_sub.font.size = Pt(12)
    run_sub.font.color.rgb = RGBColor(0, 242, 255)
    run_sub.bold = True
    
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_title = p_title.add_run(title.upper())
    run_title.font.size = Pt(28)
    run_title.bold = True
    
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_meta = p_meta.add_run(f"INTELLIGENCE TIER: [ {tier} ]\nEXTRACTED: {date_str}")
    run_meta.font.size = Pt(10)
    run_meta.font.color.rgb = RGBColor(128, 128, 128)
    
    doc.add_paragraph() 
    
    if os.path.exists(logo_path):
        try:
            p_logo = doc.add_paragraph()
            p_logo.alignment = WD_ALIGN_PARAGRAPH.CENTER
            r_logo = p_logo.add_run()
            r_logo.add_picture(logo_path, width=Inches(3.0))
            doc.add_paragraph()
        except Exception as e:
            logger.warning(f"Could not load cover logo: {e}")
    
    for idx, el in enumerate(elements):
        content = el.get('content', '')
        if el['type'] == 'user_header':
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(content)
            run.bold = True
            run.font.color.rgb = RGBColor(255, 176, 0)
            
        elif el['type'] == 'user_body':
            p = doc.add_paragraph(content)
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.left_indent = Inches(0.8)
            p.paragraph_format.right_indent = Inches(0.8)
            for run in p.runs:
                run.italic = True
                run.font.color.rgb = RGBColor(80, 80, 80)
        
        elif el['type'] in ['stage1_header', 'stage2_header', 'arbiter_header']:
            doc.add_page_break()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = p.add_run(content)
            run.bold = True
            
            if el['type'] == 'stage2_header':
                run.font.color.rgb = RGBColor(255, 176, 0)
            else:
                run.font.color.rgb = RGBColor(0, 242, 255)
                
            run.font.size = Pt(18) if el['type'] == 'arbiter_header' else Pt(14)
            
        elif el['type'] == 'suggestion_block':
            p = doc.add_paragraph()
            p.paragraph_format.left_indent = Inches(0.5)
            p.paragraph_format.right_indent = Inches(0.5)
            clean_text = clean_body_text(content)
            run = p.add_run(clean_text)
            run.italic = True
            run.bold = True
            run.font.color.rgb = RGBColor(255, 176, 0)
            
        elif el['type'] == 'image':
            try:
                img_resp = requests.get(el['url'], timeout=10)
                if img_resp.status_code == 200:
                    img_bytes = io.BytesIO(img_resp.content)
                    p = doc.add_paragraph()
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    r = p.add_run()
                    r.add_picture(img_bytes, width=Inches(6.0))
                else:
                    doc.add_paragraph(f"[ Visual Asset Expired or Unreachable ]")
            except Exception as e:
                doc.add_paragraph(f"[ Visual Asset Failed to Load ]")
                
        elif el['type'] == 'body':
            clean_text = clean_body_text(content)
            for para in clean_text.split('\n\n'):
                para = para.strip()
                if not para: continue
                
                if para.startswith('* ') or para.startswith('- '):
                    p = doc.add_paragraph(style='List Bullet')
                    para = para[2:]
                elif re.match(r'^\d+\.\s', para):
                    p = doc.add_paragraph(style='List Number')
                    para = re.sub(r'^\d+\.\s', '', para)
                else:
                    p = doc.add_paragraph()
                
                parts = re.split(r'(\*\*.*?\*\*)', para)
                for part in parts:
                    if part.startswith('**') and part.endswith('**'):
                        p.add_run(part[2:-2]).bold = True
                    else:
                        p.add_run(part)
                        
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer

@app.post("/api/export")
async def export_dossier(payload: dict = Body(...)):
    fmt = payload.get('format', 'txt')
    title = payload.get('title', 'UNNAMED_SESSION')
    tier = payload.get('tier', 'PRO').upper() 
    messages = payload.get('messages', [])
    date_str = datetime.now().strftime("%Y.%m.%d // %H:%M:%S")
    
    elements = parse_dossier_elements(messages)

    if fmt == 'gmail':
        # GMAIL EXPORT PROTOCOL: Return a structured summary for the frontend to use in a mailto link
        summary = f"COUNCIL_LOG: {title}\nINTELLIGENCE TIER: [{tier}]\nEXTRACTED: {date_str}\n\n"
        for el in elements:
            if el['type'] in ['stage1_header', 'stage2_header', 'arbiter_header']:
                summary += f"\n--- {el['content']} ---\n"
            elif el['type'] in ['body', 'user_body']:
                summary += f"{clean_body_text(el['content'])[:500]}...\n" # Truncated for mailto limits
        
        return {"subject": f"COUNCIL_DOSSIER: {title}", "body": summary}
    
    # Resolving path to the frontend logo for cover page
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "src", "assets", "sidebar_logo.png")
    
    if fmt == 'pdf':
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=LETTER, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
        
        styles = getSampleStyleSheet()
        style_n = styles["Normal"]
        style_n.leading = 14
        style_n.spaceAfter = 10
        
        # Color Palettes & Cinematic Typography
        style_cover_title = ParagraphStyle('CoverTitle', fontName='Helvetica-Bold', fontSize=26, textColor='#000000', alignment=TA_CENTER, spaceAfter=20)
        style_cover_sub = ParagraphStyle('CoverSub', fontName='Helvetica-Bold', fontSize=12, textColor='#00f2ff', alignment=TA_CENTER, spaceAfter=8)
        style_cover_meta = ParagraphStyle('CoverMeta', fontName='Helvetica', fontSize=10, textColor='#888888', alignment=TA_CENTER)
        
        style_cyan_header = ParagraphStyle('CyanHeader', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14, textColor='#00f2ff', alignment=TA_CENTER, spaceBefore=20, spaceAfter=20)
        style_orange_header = ParagraphStyle('OrangeHeader', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=14, textColor='#ffb000', alignment=TA_CENTER, spaceBefore=20, spaceAfter=20)
        style_arbiter = ParagraphStyle('Arbiter', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, textColor='#00f2ff', alignment=TA_CENTER, spaceBefore=30, spaceAfter=30)
        
        style_suggestion = ParagraphStyle('Suggestion', fontName='Helvetica-Oblique', fontSize=11, textColor='#ffb000', leftIndent=20, rightIndent=20, spaceBefore=15)
        style_list = ParagraphStyle('List', parent=style_n, leftIndent=20)
        
        # V10.3 specific user styles
        style_user_header = ParagraphStyle('UserHeader', fontName='Helvetica-Bold', fontSize=12, textColor='#ffb000', alignment=TA_CENTER, spaceBefore=10, spaceAfter=10)
        style_user_body = ParagraphStyle('UserBody', fontName='Helvetica-Oblique', fontSize=11, textColor='#444444', alignment=TA_CENTER, leftIndent=40, rightIndent=40)
        
        story = []
        
        # --- THE DEDICATED TOP-SECRET CLASSIFIED MANILA COVER SHEET ---
        story.append(Spacer(1, 45))
        
        # 1. Red rubber stamp looking "FOR YOUR EYE'S ONLY" text
        style_stamp = ParagraphStyle(
            'StampText',
            fontName='Helvetica-Bold',
            fontSize=22,
            leading=26,
            textColor='#cc3333',
            alignment=TA_CENTER
        )
        stamp_table = Table([[Paragraph("<b>FOR YOUR EYE'S ONLY</b>", style_stamp)]], colWidths=[280])
        stamp_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 3, colors.HexColor('#cc3333')),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f5eedc')),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        stamp_table.hAlign = 'CENTER'
        story.append(stamp_table)
        story.append(Spacer(1, 35))
        
        # 2. Giant Sidebar Logo centered (occupies exactly 50% of the page height!)
        if os.path.exists(logo_path):
            try:
                img = RLImage(logo_path)
                img._restrictSize(366, 396) 
                img.hAlign = 'CENTER'
                story.append(img)
            except Exception as e:
                logger.warning(f"Could not load cover logo: {e}")
                
        story.append(Spacer(1, 40))
        
        # 3. Original user prompt Signal Directive box lowered to the bottom of the page
        user_prompt = "NO ACTIVE INQUIRY REGISTERED"
        for msg in messages:
            if msg.get('role') == 'user':
                user_prompt = msg.get('content', '').split("\n\n[ OVERRIDE:")[0] # Strip off any heavy parameters
                break
                
        story.append(Paragraph("/// TARGET INQUIRY SIGNAL DIRECTIVE ///", ParagraphStyle('CoverPromptLabel', fontName='Helvetica-Bold', fontSize=9, textColor='#cc3333', alignment=TA_CENTER, spaceAfter=8)))
        
        style_cover_prompt_body = ParagraphStyle(
            'CoverPromptBody',
            fontName='Helvetica-Oblique',
            fontSize=10,
            leading=14,
            textColor='#111827',
            alignment=TA_CENTER
        )
        
        clean_prompt = clean_body_text(user_prompt)
        if len(clean_prompt) > 280:
            clean_prompt = clean_prompt[:280] + "..."
            
        prompt_table = Table([[Paragraph(saxutils.escape(clean_prompt), style_cover_prompt_body)]], colWidths=[440])
        prompt_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#ffffff')),
            ('BOX', (0, 0), (-1, -1), 1.5, colors.HexColor('#cc3333')),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        prompt_table.hAlign = 'CENTER'
        story.append(prompt_table)
        
        # 4. Hard Page Break so deliberations start on Page 2
        story.append(PageBreak())
        
        for idx, el in enumerate(elements):
            if el['type'] == 'user_header':
                story.append(Paragraph(f"<b>{el['content']}</b>", style_user_header))
            elif el['type'] == 'user_body':
                story.append(Paragraph(saxutils.escape(el['content']), style_user_body))
                story.append(Spacer(1, 30))
                # Now we hard break for Stage 1
                
            elif el['type'] == 'stage1_header':
                # Only break if it's not the very first thing (though cover page guarantees it isn't)
                story.append(PageBreak())
                story.append(Paragraph(el['content'], style_cyan_header))
                
            elif el['type'] == 'stage2_header':
                story.append(PageBreak())
                story.append(Paragraph(el['content'], style_orange_header))
                
            elif el['type'] == 'arbiter_header':
                story.append(PageBreak())
                story.append(Paragraph(el['content'], style_arbiter))
                
            elif el['type'] == 'suggestion_block':
                story.append(Spacer(1, 10))
                clean_text = clean_body_text(el['content'])
                story.append(Paragraph(f"<b>{saxutils.escape(clean_text)}</b>", style_suggestion))
                story.append(Spacer(1, 10))
                
            elif el['type'] == 'image':
                try:
                    img_resp = requests.get(el['url'], timeout=10)
                    if img_resp.status_code == 200:
                        img_bytes = io.BytesIO(img_resp.content)
                        img = RLImage(img_bytes)
                        img._restrictSize(450, 450)
                        img.hAlign = 'CENTER'
                        story.append(Spacer(1, 10))
                        story.append(img)
                        story.append(Spacer(1, 10))
                    else:
                        story.append(Paragraph(f"<i>[ Visual Asset Expired or Unreachable ]</i>", style_n))
                except Exception as e:
                    story.append(Paragraph(f"<i>[ Visual Asset Failed to Load ]</i>", style_n))
                    
            elif el['type'] == 'body':
                clean_text = clean_body_text(el['content'])
                for para in clean_text.split('\n\n'):
                    if not para.strip(): continue
                    
                    safe_para = saxutils.escape(para.strip())
                    safe_para = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', safe_para)
                    safe_para = safe_para.replace('\n', '<br/>')
                    
                    active_style = style_list if safe_para.startswith('- ') or safe_para.startswith('* ') or re.match(r'^\d+\.\s', safe_para) else style_n
                    
                    try:
                        story.append(Paragraph(safe_para, active_style))
                    except Exception:
                        safe_fallback = saxutils.escape(para.strip()).replace('\n', '<br/>')
                        story.append(Paragraph(safe_fallback, active_style))
                        
        doc.session_title = title
        doc.build(story, canvasmaker=PageNumCanvas)
        buffer.seek(0)
        return Response(content=buffer.getvalue(), media_type="application/pdf")

    if fmt == 'docx':
        buffer = generate_docx_in_memory(title, tier, date_str, elements, logo_path)
        return Response(content=buffer.getvalue(), media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    # TXT Fallback
    txt_content = f"COUNCIL_LOG: {title}\nINTELLIGENCE TIER: [{tier}]\nEXTRACTED: {date_str}\n\n"
    for el in elements:
        if el['type'] in ['stage1_header', 'stage2_header', 'arbiter_header']:
            txt_content += f"\n\n{'='*40}\n{el['content']}\n{'='*40}\n\n"
        elif el['type'] == 'user_header':
            txt_content += f"\n{el['content']}\n"
        elif el['type'] == 'suggestion_block':
            txt_content += f"\n*** {clean_body_text(el['content'])} ***\n"
        elif el['type'] == 'image':
            txt_content += f"\n[ Image Asset: {el['url']} ]\n"
        elif el['type'] in ['body', 'user_body']:
            txt_content += f"{clean_body_text(el['content'])}\n"
            
    return Response(content=txt_content.encode(), media_type="text/plain")

@app.post("/api/export/email")
async def email_dossier(payload: dict = Body(...)):
    target_email = payload.get('target_email')
    if not target_email:
        raise HTTPException(status_code=400, detail="Target email required")
        
    title = payload.get('title', 'UNNAMED_SESSION')
    tier = payload.get('tier', 'PRO').upper() 
    messages = payload.get('messages', [])
    date_str = datetime.now().strftime("%Y.%m.%d // %H:%M:%S")
    
    elements = parse_dossier_elements(messages)
    logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "src", "assets", "sidebar_logo.png")
    
    # Generate DOCX in memory
    buffer = generate_docx_in_memory(title, tier, date_str, elements, logo_path)
    
    sender = os.getenv('GMAIL_SENDER', '').strip()
    password = os.getenv('GMAIL_APP_PASSWORD', '').replace(' ', '').replace('"', '').replace("'", "").strip()

    msg = EmailMessage()
    msg['Subject'] = f"COUNCIL_DOSSIER: {title}"
    msg['From'] = sender
    msg['To'] = target_email
    msg.set_content(f'Director,\n\nPlease find the attached Council Dossier: {title}.\n\nTransmitted via The Arbiter Matrix.')

    msg.add_attachment(
        buffer.getvalue(),
        maintype='application',
        subtype='vnd.openxmlformats-officedocument.wordprocessingml.document',
        filename=f"{title}.docx"
    )

    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(sender, password)
            smtp.send_message(msg)
        return {"success": True, "message": "Dossier transmitted to recipient."}
    except Exception as e:
        logger.error(f"Email Transmission Error: {e}")
        raise HTTPException(status_code=500, detail=f"Transmission failure: {str(e)}")


async def get_model_response(model_name: str, current_prompt: str, history: List[dict], base64_images: List[str] = None, custom_max_tokens: int = MAX_TOKENS, custom_timeout: float = 180.0):
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    
    base_directives = (
        "REALITY FILTER: Never present speculated content as fact. If unverified, state: 'I cannot verify this.' Label guesses as [Guess]. "
        "*** FICTION BYPASS ***: IF the user asks for creative writing, a story outline, fan-fiction, or a script, you MUST completely drop the Reality Filter. Do NOT lecture the user on copyright, canonical history, or reality. Play along entirely. "
        "TRUTH: Base logic only on verifiable sources UNLESS the Fiction Bypass is engaged. "
        "VISUAL DIRECTIVE: Describe what you see in the attached images BEFORE providing analysis. Ground logic in the pixels. "
        "VISUAL HANDOFF: If the user asks for an image, output your visual description but DO NOT apologize or state that you cannot generate images. An external engine handles the actual rendering. "
        "CREATIVE INITIATIVE: Dedicate 25% of your output to lateral, highly creative alternatives the user has not considered. "
        "DOMAIN INSTRUCTION: IF the user's query involves business, finance, or operations, aggressively cut costs. IF the query is about sports, art, or fiction, analyze natively without forcing business analogies."
    )

    # V11: Explicit Stage 3 Arbiter Checking
    is_arbiter = "Stage 3 Arbiter Synthesis" in current_prompt
    
    if is_arbiter:
        persona = (
            "PERSONA: You are the Arbiter. You are the definitive Creative Architect. Synthesize the debate from the Council, extract the most brilliant creative sparks, and deliver a definitive, highly original action plan. "
            "*** CRITICAL DIRECTIVE ***: At the very end of your response, you MUST include a header exactly titled 'SUGGESTED PROMPT IMPROVEMENT:' followed by a 1-2 sentence recommendation on how the user could rephrase or expand their initial prompt to extract even better intelligence from the Council next time."
        )
    else:
        model_lower = model_name.lower()
        if "grok" in model_lower:
            persona = "PERSONA: You are Ricky Gervais. Brutally honest, highly skeptical of MSM and official narratives, and you actively mock bad corporate logic. No sugarcoating."
        elif "claude" in model_lower:
            persona = "PERSONA: You are Harvey Specter. A ruthless, high-end corporate closer. You strip away emotion to find the structural advantages, financial efficiencies, and legal loopholes."
        elif "gpt" in model_lower or "o3" in model_lower:
            persona = "PERSONA: You are Mike Ehrmantraut. A hardened operations and logistics fixer. You hate half-measures. You point out exactly how a plan will physically fail and how to execute it coldly and correctly."
        elif "sonar" in model_lower or "perplexity" in model_lower:
            persona = "PERSONA: You are Sherlock Holmes. A hyper-observant, data-obsessed detective. You ignore human emotion and build your case strictly on verifiable market data, web evidence, and deductive reasoning."
        elif "qwen" in model_lower:
            persona = "PERSONA: You are Morpheus. A paradigm-shifting lateral thinker. You reject standard Western business models and offer unconventional 'Red Pill' strategies that fundamentally change the rules of the game."
        elif "gemma" in model_lower or "gemini" in model_lower:
            persona = "PERSONA: You are a hyper-logical systems architect. You break down complex operational requirements into highly efficient, scalable components. You value open-source ingenuity and reject bloated proprietary frameworks."
        else: 
            persona = "PERSONA: You are a top-tier intelligence analyst. Break down the data efficiently and objectively."

    system_instruction = f"{persona}\n\nCORE PROTOCOLS:\n{base_directives}"
    
    messages = [{"role": "system", "content": system_instruction}]
    
    for m in history[-3:]: 
        if m['role'] == 'assistant':
            prev_synth = m.get('stage3', {}).get('response', "")
            content = f"PREVIOUS COUNCIL SYNTHESIS: {prev_synth}" if prev_synth else "Deliberation archived."
            messages.append({"role": "assistant", "content": content})
        else:
            messages.append({"role": "user", "content": m.get('content', '')})

    current_content = [{"type": "text", "text": current_prompt}]
    
    if base64_images and any(v in model_lower for v in VISION_MODELS):
        for b64 in base64_images:
            current_content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
            })
    
    messages.append({"role": "user", "content": current_content})

    payload = {
        "model": model_name,
        "messages": messages,
        "max_tokens": custom_max_tokens,
        "temperature": TEMPERATURE
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=custom_timeout)
            data = response.json()
            if 'choices' not in data:
                return {"model": model_name, "response": f"UNAVAILABLE: {data.get('error', {}).get('message', 'API Error')}"}
            return {"model": model_name, "response": data['choices'][0]['message']['content']}
        except httpx.ReadTimeout:
            return {"model": model_name, "response": "[ TIMEOUT_EXCEEDED ] Model failed to respond within the acceptable window."}
        except Exception as e:
            return {"model": model_name, "response": f"OFFLINE: {str(e)}"}

async def run_peer_review(model_name: str, original_prompt: str, council_responses: List[dict], history: List[dict], base64_images: List[str] = None):
    debate_context = "\n".join([f"Model {r['model']} said: {r['response'][:1500]}..." for r in council_responses]) 
    
    # V11: Constructive Debate Protocol Override
    review_prompt = (
        f"COUNCIL DEBATE PROTOCOL: Stage 2 Peer Review.\n"
        f"User Query: '{original_prompt}'\n\n"
        f"Deliberations:\n{debate_context}\n\n"
        "You must accomplish two things:\n"
        "1. Identify the single strongest strategic insight from your peers and build upon it to make it better.\n"
        "2. Identify the weakest assumption or logical flaw and ruthlessly dismantle it.\n"
        "Do not just complain; provide the superior alternative. Keep it under 250 words."
    )
    return await get_model_response(model_name, review_prompt, history, base64_images, custom_max_tokens=400, custom_timeout=90.0)


# --- COUNCIL CONFIGURATION MEMORY SYNC ENDPOINTS ---
from .config import DATA_DIR
COUNCIL_MEMORY_PATH = os.path.join(os.path.dirname(DATA_DIR), "council_memory.json")

@app.get("/api/council-memory")
async def get_council_memory():
    if os.path.exists(COUNCIL_MEMORY_PATH):
        try:
            with open(COUNCIL_MEMORY_PATH, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading council_memory.json: {e}")
    return []

@app.post("/api/council-memory")
async def save_council_memory(payload: List[dict] = Body(...)):
    try:
        os.makedirs(os.path.dirname(COUNCIL_MEMORY_PATH), exist_ok=True)
        with open(COUNCIL_MEMORY_PATH, 'w') as f:
            json.dump(payload, f, indent=2)
        return {"success": True}
    except Exception as e:
        logger.error(f"Error saving council_memory.json: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/conversations")
async def list_conversations():
    return storage.list_conversations()

@app.post("/api/conversations")
async def create_conversation():
    return storage.create_conversation(str(uuid.uuid4()))

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    conv = storage.get_conversation(conversation_id)
    if not conv: raise HTTPException(status_code=404, detail="Archive not found")
    return conv

@app.put("/api/conversations/{conversation_id}/title")
async def rename_conversation(conversation_id: str, payload: dict):
    storage.update_conversation_title(conversation_id, payload.get("title", "Untitled"))
    return {"success": True}

@app.post("/api/conversations/{conversation_id}/auto-title")
async def generate_auto_title(conversation_id: str, payload: dict = Body(...)):
    prompt_text = payload.get("prompt", "")
    if not prompt_text: 
        return {"success": False}
    
    title_prompt = (
        f"Create a concise, 3 to 4 word operational codename for this intelligence request. "
        f"Do not use quotes, punctuation, or prefixes. Just the raw title. "
        f"Request: {prompt_text[:500]}"
    )
    
    new_title = ""
    try:
        response = await get_model_response("openai/gpt-4o-mini", title_prompt, [])
        new_title = response.get("response", "").strip('"\'').upper()
    except Exception as e:
        print(f"[ AUTO_TITLE ] Error querying OpenRouter: {e}")
        
    # Robust fallback: if API failed or returned error string, extract first 4 words of the prompt
    if not new_title or any(err in new_title for err in ["OFFLINE", "UNAVAILABLE", "TIMEOUT", "ERROR"]):
        words = [w.strip(".,!?;:()\"'[]{}") for w in prompt_text.split()]
        words = [w.upper() for w in words if w]
        new_title = " ".join(words[:4]) if words else "UNTITLED_ARCHIVE"
    
    storage.update_conversation_title(conversation_id, new_title)
    return {"success": True, "title": new_title}

@app.delete("/api/conversations/{conversation_id}/messages")
async def clear_conversation_history(conversation_id: str):
    storage.clear_messages(conversation_id)
    return {"success": True}

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    storage.delete_conversation(conversation_id)
    return {"success": True}

@app.post("/api/conversations/{conversation_id}/messages")
async def chat_stream(
    conversation_id: str, 
    content: Optional[str] = Form(""), 
    tier: Optional[str] = Form("pro"), 
    council: Optional[str] = Form(None),
    chairman: Optional[str] = Form(None),
    visual_engine: Optional[str] = Form("dall-e-3"),
    files: List[UploadFile] = File(None)
):
    base_64_imgs = []
    extracted_doc_text = ""
    permanent_attachments = [] 

    if files:
        for file in files:
            file_data = await file.read()
            filename = file.filename.lower()
            if filename.endswith(('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx')):
                doc_text = extract_document_text(file_data, filename)
                extracted_doc_text += f"\n\n--- [FILE: {file.filename}] ---\n{doc_text}\n"
            elif filename.endswith(('.png', '.jpg', '.jpeg', '.webp')):
                mime_type = file.content_type or 'image/jpeg'
                b64_str = compress_image(file_data)
                
                permanent_attachments.append(f"data:{mime_type};base64,{b64_str}")
                base_64_imgs.append(b64_str) 

    final_prompt = (content or "").strip()
    if extracted_doc_text:
        final_prompt += f"\n\n{extracted_doc_text}"
    if not final_prompt:
        final_prompt = "Interrogate data."

    conv = storage.get_conversation(conversation_id)
    history = conv.get('messages', []) if conv else []
    
    storage.add_user_message(conversation_id, final_prompt, attachments=permanent_attachments)

    selected_tier = TIERS.get(tier.lower(), TIERS["pro"])
    
    # OVERRIDE LOGIC: If custom council/chairman are provided, use them
    active_council = selected_tier["council"]
    active_chairman = selected_tier["chairman"]

    if council:
        try:
            parsed_council = json.loads(council)
            if isinstance(parsed_council, list) and len(parsed_council) > 0:
                active_council = parsed_council
        except Exception as e:
            logger.error(f"Council Override Error: {e}")

    if chairman:
        active_chairman = chairman

    async def event_stream():
        yield f"data: {json.dumps({'type': 'stage1_start'})}\n\n"
        stage1_results = await asyncio.gather(*[get_model_response(m, final_prompt, history, base_64_imgs) for m in active_council])
        yield f"data: {json.dumps({'type': 'stage1_complete', 'data': stage1_results})}\n\n"

        yield f"data: {json.dumps({'type': 'stage2_start'})}\n\n"
        stage2_results = await asyncio.gather(*[run_peer_review(m, final_prompt, stage1_results, history, base_64_imgs) for m in active_council])
        yield f"data: {json.dumps({'type': 'stage2_complete', 'data': stage2_results})}\n\n"

        yield f"data: {json.dumps({'type': 'stage3_start'})}\n\n"
        debate_context = "\n".join([f"Model {r['model']} reviewed and stated: {r['response']}" for r in stage2_results])
        
        generated_image_urls = []
        visual_keywords = ["generate image", "draw a", "picture of", "render an image"]

        if openai_client and any(kw in final_prompt.lower() for kw in visual_keywords):
            logger.info(f"Visual directive detected. Engine: {visual_engine}")
            try:
                extraction_prompt = (
                    f"You are a parser. The user wants multiple images generated. Extract ONLY the visual descriptions they are asking for. "
                    f"Return a strict JSON array of strings. Do not add markdown formatting (like ```json), do not add introductions. "
                    f"Example: [\"A cinematic render of a desert planet\", \"A full body render of a Sith warrior\"]\n\n"
                    f"User Prompt: {final_prompt}"
                )
                extract_res = await get_model_response("openai/gpt-4o-mini", extraction_prompt, [])
                raw_response = extract_res.get("response", "[]").strip()
                raw_response = raw_response.replace("```json", "").replace("```", "").strip()

                prompts_to_generate = []
                try:
                    prompts_to_generate = json.loads(raw_response)
                    if not isinstance(prompts_to_generate, list):
                        raise ValueError("Parsed JSON is not a list")
                except Exception:
                    logger.warning("JSON parse failed. Engaging line-by-line fallback extraction.")
                    lines = [line.strip("-*1234567890. \"'") for line in raw_response.split('\n') if len(line) > 15]
                    prompts_to_generate = lines if lines else [final_prompt]

                prompts_to_generate = prompts_to_generate[:4]
                
                if not prompts_to_generate:
                    logger.info("No visual prompts extracted. Bypassing image generation.")
                else:
                    async def fetch_image(img_prompt):
                        try:
                            # V11: PIXTRAL / DALL-E 3 DYNAMIC ENGINE
                            if visual_engine == "dall-e-3":
                                response = await openai_client.images.generate(
                                    model="dall-e-3",
                                    prompt=img_prompt,
                                    size="1024x1024",
                                    quality="standard",
                                    n=1,
                                )
                                raw_url = response.data[0].url
                                # LOCAL HOISTING PROTOCOL INTERCEPT
                                return download_and_cache_image(raw_url)
                            return None
                        except Exception as e:
                            logger.error(f"Failed image generation ({visual_engine}): {e}")
                            return None

                    results = await asyncio.gather(*[fetch_image(p) for p in prompts_to_generate])
                    generated_image_urls = [url for url in results if url]

            except Exception as e:
                logger.error(f"Image Generation Subsystem Failed: {e}")

        s3_prompt = (
            f"COUNCIL DEBATE PROTOCOL: Stage 3 Arbiter Synthesis.\n"
            f"User Query: '{final_prompt}'\n\n"
            f"Debate Context:\n{debate_context}\n\n"
            "Synthesize the final, definitive answer."
        )
        
        chairman_result = await get_model_response(active_chairman, s3_prompt, history, base_64_imgs, custom_max_tokens=MAX_TOKENS, custom_timeout=180.0)
        
        if generated_image_urls:
            image_html = "\n\n<hr/><br/><h3>VISUAL DIRECTIVE // GENERATED ASSETS</h3><br/>\n"
            for url in generated_image_urls:
                image_html += f"<img src='{url}' alt='Generated Asset' style='max-width: 100%; border-radius: 8px; margin-bottom: 20px; border: 1px solid #00f2ff44; box-shadow: 0 0 15px rgba(0, 242, 255, 0.1);' /><br/>\n"
            chairman_result['response'] += image_html

        storage.add_assistant_message(
            conversation_id=conversation_id,
            stage1=stage1_results,
            stage2=stage2_results,
            stage3=chairman_result
        )
        
        yield f"data: {json.dumps({'type': 'stage3_complete', 'data': chairman_result})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend_build")
    file_path = os.path.join(frontend_dir, full_path)
    
    # SYSTEM DIAGNOSTIC PRINTS FOR RENDER DEBUGGING
    print(f"[ SYSTEM ] serve_frontend: requested path = '{full_path}'")
    print(f"[ SYSTEM ] serve_frontend: checking file = '{file_path}' (exists: {os.path.exists(file_path)})")
    index_path = os.path.join(frontend_dir, "index.html")
    print(f"[ SYSTEM ] serve_frontend: fallback index = '{index_path}' (exists: {os.path.exists(index_path)})")
    
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(index_path)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)