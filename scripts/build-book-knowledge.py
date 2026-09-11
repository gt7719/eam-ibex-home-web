#!/usr/bin/env python3
"""Build the read-only AI knowledge index from the approved iBeX DOCX source."""

import json
import re
import sys
from pathlib import Path

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph


def clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def blocks(document):
    for child in document.element.body.iterchildren():
        if child.tag.endswith("}p"):
            yield Paragraph(child, document)
        elif child.tag.endswith("}tbl"):
            yield Table(child, document)


def table_text(table: Table) -> str:
    rows = []
    for row in table.rows:
        cells = []
        for cell in row.cells:
            value = clean(cell.text)
            if value and (not cells or value != cells[-1]):
                cells.append(value)
        if cells:
            rows.append(" | ".join(cells))
    return "\n".join(rows)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: build-book-knowledge.py SOURCE.docx OUTPUT.json")
    source, output = map(Path, sys.argv[1:])
    document = Document(source)
    sections = []
    current = None
    started = False
    chapter = ""

    for block in blocks(document):
        if isinstance(block, Paragraph):
            value = clean(block.text)
            if not value:
                continue
            style = block.style.name
            if style == "Heading 1" and re.match(r"БҮЛЭГ\s+1\b", value, re.I):
                started = True
            if not started:
                continue
            if style == "Heading 1":
                chapter = value
            if style in {"Heading 1", "Heading 2"}:
                if current and current["parts"]:
                    sections.append(current)
                current = {"title": value, "chapter": chapter or value, "parts": []}
            elif current:
                current["parts"].append(value)
        elif started and current:
            value = table_text(block)
            if value:
                current["parts"].append(value)
    if current and current["parts"]:
        sections.append(current)

    entries = []
    for index, section in enumerate(sections, 1):
        content = "\n\n".join(section["parts"])
        words = re.findall(r"[\wА-ЯӨҮЁа-яөүё-]{2,}", f'{section["chapter"]} {section["title"]}'.lower())
        keywords = list(dict.fromkeys(words))[:30]
        entries.append({
            "id": f"ibex-book-{index:03d}",
            "topic": "ibex-book",
            "titleMn": section["title"],
            "titleEn": section["title"],
            "contentMn": content,
            "contentEn": content,
            "keywords": keywords,
            "sourceLabel": f'iBeX ном · {section["chapter"]}',
            "sourceUrl": "",
            "version": "MN-2026",
            "status": "approved",
            "visibility": "public",
            "stage": "general",
            "enabled": True,
        })

    output.write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"indexed {len(entries)} sections from {source.name}")


if __name__ == "__main__":
    main()
