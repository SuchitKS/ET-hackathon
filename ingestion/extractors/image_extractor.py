"""Extract text from P&ID drawing images (PNG) via OCR.

P&IDs are diagrams, not prose, so OCR output is sparse (mostly equipment tags,
titles, and instrument labels). That sparse text is still enough to link the
drawing into the knowledge graph by equipment tag.
"""
from PIL import Image
import pytesseract


def extract_image(filepath: str) -> str:
    try:
        img = Image.open(filepath)
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        # OCR is a bonus signal, not a hard requirement -- never let it break ingestion
        return f"[OCR unavailable for {filepath}: {e}]"
