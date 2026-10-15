from io import BytesIO
from typing import Dict, Any, Optional


def _money(amount: Any, symbol: str = "$") -> str:
    try:
        return f"{symbol}{float(amount):,.2f}"
    except (TypeError, ValueError):
        return f"{symbol}0.00"


def generate_quote_pdf(quote: Dict[str, Any], profile: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Generate a branded PDF proposal. Uses reportlab when installed;
    falls back to a minimal PDF writer so demos never fail.
    """
    symbol = (profile or {}).get("currency_symbol") or "$"
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.75 * inch, leftMargin=0.75 * inch)
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name="Brand", fontSize=18, textColor=colors.HexColor("#d9480f"), spaceAfter=6, fontName="Helvetica-Bold"))
        styles.add(ParagraphStyle(name="Muted", fontSize=9, textColor=colors.HexColor("#64748b")))
        styles.add(ParagraphStyle(name="Body", fontSize=10, leading=14, spaceAfter=8))

        biz = (profile or {}).get("business_name") or "QuoteFlow Contractor"
        license_no = (profile or {}).get("license_number", "")
        currency = (profile or {}).get("currency_code") or "USD"
        story = []
        story.append(Paragraph(biz, styles["Brand"]))
        story.append(
            Paragraph(
                f"Professional Estimate  ·  {quote.get('quote_number', '')}  ·  {license_no}  ·  {currency}",
                styles["Muted"],
            )
        )
        story.append(Spacer(1, 12))

        client = quote.get("client") or {}
        story.append(Paragraph(f"<b>Prepared for:</b> {client.get('name', 'Client')}", styles["Body"]))
        addr = client.get("address") or ""
        zip_code = client.get("zip_code") or ""
        loc = "  ·  ".join(x for x in [addr, zip_code] if x)
        if loc:
            story.append(Paragraph(loc, styles["Muted"]))
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"<b>{quote.get('project_title', 'Project Estimate')}</b>", styles["Body"]))
        story.append(Paragraph(quote.get("project_scope_summary", ""), styles["Body"]))

        rows = [["Category", "Description", "Qty", f"Unit ({symbol})", "Total"]]
        for item in quote.get("line_items") or []:
            rows.append(
                [
                    str(item.get("category", "")),
                    str(item.get("description", ""))[:48],
                    f"{item.get('quantity', 0)}",
                    _money(item.get("unit_cost", 0), symbol),
                    _money(item.get("total_cost", 0), symbol),
                ]
            )
        table = Table(rows, colWidths=[1.0 * inch, 3.2 * inch, 0.6 * inch, 0.9 * inch, 0.9 * inch])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17202a")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#cbd5e1")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ]
            )
        )
        story.append(Spacer(1, 8))
        story.append(table)
        story.append(Spacer(1, 12))
        tax_pct = quote.get("tax_percent")
        tax_amt = quote.get("tax_amount")
        if tax_pct is not None and tax_amt is not None:
            story.append(
                Paragraph(
                    f"Tax ({tax_pct}%): {_money(tax_amt, symbol)}",
                    styles["Muted"],
                )
            )
        story.append(Paragraph(f"<b>Total:</b> {_money(quote.get('total_amount', 0), symbol)}", styles["Body"]))
        story.append(Paragraph(f"Valid until: {quote.get('valid_until', '')}", styles["Muted"]))
        story.append(Spacer(1, 10))
        story.append(Paragraph((quote.get("client_proposal_prose") or "").replace("\n", "<br/>"), styles["Body"]))
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"<b>Terms:</b> {quote.get('terms_and_conditions', '')}", styles["Muted"]))

        doc.build(story)
        return buffer.getvalue()
    except Exception as e:
        print(f"reportlab PDF failed ({e}); using minimal PDF fallback")
        return _minimal_pdf(quote, profile)


def _minimal_pdf(quote: Dict[str, Any], profile: Optional[Dict[str, Any]] = None) -> bytes:
    """Tiny valid PDF without external deps."""
    symbol = (profile or {}).get("currency_symbol") or "$"
    biz = (profile or {}).get("business_name") or "QuoteFlow"
    title = quote.get("project_title", "Estimate")
    total = quote.get("total_amount", 0)
    qn = quote.get("quote_number", "")
    lines = [
        f"{biz}",
        f"Quote {qn}",
        f"{title}",
        f"Total: {_money(total, symbol)}",
        f"Valid: {quote.get('valid_until', '')}",
    ]
    content = "BT /F1 12 Tf 50 750 Td\n"
    for i, line in enumerate(lines):
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        if i == 0:
            content += f"({safe}) Tj\n"
        else:
            content += f"0 -18 Td ({safe}) Tj\n"
    content += "ET"
    stream = content.encode("latin-1", errors="replace")
    objects = []
    objects.append(b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n")
    objects.append(b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n")
    objects.append(
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n"
    )
    objects.append(
        f"4 0 obj<< /Length {len(stream)} >>stream\n".encode("latin-1")
        + stream
        + b"\nendstream\nendobj\n"
    )
    objects.append(b"5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n")

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(out))
        out.extend(obj)
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(offsets)}\n".encode("latin-1"))
    out.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
    out.extend(
        f"trailer<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "latin-1"
        )
    )
    return bytes(out)
