"""Create one view-only PDF per incoming document from the authoritative bundle.

The source PDF in references/documents is never changed. Attachment pages stay
with their parent document, so the 11 source pages produce exactly nine PDFs.
"""

from pathlib import Path

import fitz
from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "references" / "documents"
OUTPUT_DIR = ROOT / "public" / "docs"
PAGES = {
    "01": (2,),
    "02": (7,),
    "03": (10, 11),
    "04": (3,),
    "05": (5, 6),
    "06": (9,),
    "07": (1,),
    "08": (4,),
    "09": (8,),
}


def update_demo_exam_date(output: Path) -> None:
    """Change only the *new* exam date in the derived demo copy of document 06.

    The authoritative bundle is never changed. This deliberately leaves the
    previous (cancelled) 9 October date intact and makes the website fixture
    agree with the PDF shown by its viewer.
    """
    pdf = fitz.open(output)
    try:
        page = pdf[0]
        old_date = "พฤหัสบดีที่8 ตุลาคม2569"
        parts = page.search_for(old_date)
        if len(parts) != 3 or any(abs(part.y0 - parts[0].y0) > 0.5 for part in parts):
            raise RuntimeError(f"{output.name}: could not uniquely locate new exam date")
        old_box = parts[0] | parts[1] | parts[2]
        # Keep the table's vector rules; erase only the original text glyphs.
        page.add_redact_annot(old_box + (-0.3, -0.3, 0.3, 0.3), fill=(1, 1, 1))
        page.apply_redactions(images=0, graphics=0, text=0)

        font_dir = Path(r"C:\Windows\Fonts")
        font_file = font_dir / "LeelawUI.ttf"
        if not font_file.is_file():
            raise RuntimeError(f"Thai font unavailable: {font_file}")
        css = (
            '@font-face {font-family: "Leela UI"; src: url("LeelawUI.ttf");}'
            'body {font-family: "Leela UI"; font-size: 12pt; color: #000; '
            'margin: 0; padding: 0; line-height: 1.2;}'
        )
        spare, scale = page.insert_htmlbox(
            fitz.Rect(360.9, 394.7, 540, 416.2),
            "<body>พุธที่ 7 ตุลาคม 2569</body>",
            css=css,
            archive=fitz.Archive(str(font_dir)),
            scale_low=1,
        )
        if spare < 0 or scale != 1:
            raise RuntimeError(f"{output.name}: replacement date did not fit")
        pdf.save(output, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
    finally:
        pdf.close()

    check = fitz.open(output)
    try:
        text = check[0].get_text()
        # MuPDF's extraction maps the shaped Thai mai ek in Leela UI to a
        # Latin combining glyph, so verify the stable text fragments as well
        # as the absence of the old date; the rendered page is checked too.
        if "พุธที" not in text or "7 ตุลาคม 2569" not in text or "พฤหัสบดีที่8 ตุลาคม2569" in text:
            raise RuntimeError(f"{output.name}: replacement date text check failed")
        if "ศุกร์ที่9 ตุลาคม2569" not in text:
            raise RuntimeError(f"{output.name}: cancelled date was unexpectedly changed")
    finally:
        check.close()


def main() -> None:
    sources = list(SOURCE_DIR.glob("*.pdf"))
    if len(sources) != 1:
        raise RuntimeError(f"Expected one authoritative PDF, found {len(sources)}")
    reader = PdfReader(sources[0])
    if len(reader.pages) != 11:
        raise RuntimeError(f"Expected 11 source pages, found {len(reader.pages)}")
    if sorted(page for pages in PAGES.values() for page in pages) != list(range(1, 12)):
        raise RuntimeError("The split mapping must cover each source page exactly once")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for doc_id, pages in PAGES.items():
        writer = PdfWriter()
        for page in pages:
            writer.add_page(reader.pages[page - 1])
        output = OUTPUT_DIR / f"doc-{doc_id}.pdf"
        with output.open("wb") as stream:
            writer.write(stream)
        if doc_id == "06":
            update_demo_exam_date(output)
        actual_pages = len(PdfReader(output).pages)
        if actual_pages != len(pages):
            raise RuntimeError(f"{output.name}: expected {len(pages)} pages, found {actual_pages}")
        print(f"{output.name}: source page(s) {', '.join(map(str, pages))}")


if __name__ == "__main__":
    main()
