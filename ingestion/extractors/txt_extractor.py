"""Extract plain text from .txt files (email threads)."""


def extract_txt(filepath: str) -> str:
    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()
