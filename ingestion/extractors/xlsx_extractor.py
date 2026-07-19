"""Extract plain text from .xlsx files (work orders)."""
import openpyxl


def extract_xlsx(filepath: str) -> str:
    """Flatten every populated cell into 'label: value' style lines, sheet by sheet."""
    wb = openpyxl.load_workbook(filepath, data_only=True)
    parts = []

    for sheet in wb.worksheets:
        for row in sheet.iter_rows():
            cells = [str(c.value).strip() for c in row if c.value not in (None, "")]
            if cells:
                parts.append(" | ".join(cells))

    return "\n".join(parts)
