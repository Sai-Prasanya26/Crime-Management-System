"""
PDF Report Generation Service for Phase 12 Crime Intelligence Reports.
Renders clean, institutional A4 PDF documents using ReportLab conforming
to minimal, professional crime intelligence design standards.
"""

import io
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import logging

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Institutional Palette
COLOR_NAVY = colors.HexColor("#0B1F3A")
COLOR_BLUE = colors.HexColor("#1769AA")
COLOR_SLATE = colors.HexColor("#2563EB")
COLOR_MUTED = colors.HexColor("#5D6878")
COLOR_BORDER = colors.HexColor("#D9E1EA")
COLOR_BG_CARD = colors.HexColor("#F8FAFC")
COLOR_BG_TH = colors.HexColor("#0B1F3A")
COLOR_BG_ROW_ALT = colors.HexColor("#F8FAFC")
COLOR_TEXT_MAIN = colors.HexColor("#0F172A")
COLOR_GREEN = colors.HexColor("#16A34A")
COLOR_AMBER = colors.HexColor("#D97706")
COLOR_RED = colors.HexColor("#DC2626")


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to calculate total page count and render professional footers."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            super().showPage()
        super().save()

    def draw_footer(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 7.5)
        self.setFillColor(COLOR_MUTED)
        
        # Rule line
        self.setStrokeColor(COLOR_BORDER)
        self.setLineWidth(0.5)
        self.line(36, 26, A4[0] - 36, 26)
        
        # Left branding
        self.drawString(36, 16, "Crime Intelligence & Management Portal  |  Confidential  |  Official Use Only")
        
        # Right pagination
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(A4[0] - 36, 16, page_str)
        self.restoreState()


class PdfReportService:
    """Compiles structured crime intelligence reports into publication-grade PDF documents."""

    @classmethod
    def _create_styles(cls) -> Dict[str, ParagraphStyle]:
        base_styles = getSampleStyleSheet()
        
        styles = {
            "OrgSuper": ParagraphStyle(
                "OrgSuper",
                parent=base_styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=7.5,
                leading=9,
                textColor=COLOR_MUTED,
                textTransform="uppercase",
            ),
            "ReportTitle": ParagraphStyle(
                "ReportTitle",
                parent=base_styles["Title"],
                fontName="Helvetica-Bold",
                fontSize=15,
                leading=18,
                textColor=COLOR_NAVY,
                alignment=0,
                spaceAfter=2,
            ),
            "JurisdictionSubtitle": ParagraphStyle(
                "JurisdictionSubtitle",
                parent=base_styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=9.5,
                leading=12,
                textColor=COLOR_BLUE,
            ),
            "MetaLabel": ParagraphStyle(
                "MetaLabel",
                parent=base_styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=7.5,
                leading=9,
                textColor=COLOR_MUTED,
            ),
            "MetaValue": ParagraphStyle(
                "MetaValue",
                parent=base_styles["Normal"],
                fontName="Helvetica",
                fontSize=8,
                leading=10,
                textColor=COLOR_TEXT_MAIN,
            ),
            "CardTitle": ParagraphStyle(
                "CardTitle",
                parent=base_styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=7,
                leading=8.5,
                textColor=COLOR_MUTED,
                textTransform="uppercase",
                alignment=1,
            ),
            "CardValue": ParagraphStyle(
                "CardValue",
                parent=base_styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=11.5,
                leading=14,
                textColor=COLOR_NAVY,
                alignment=1,
            ),
            "CardSubtext": ParagraphStyle(
                "CardSubtext",
                parent=base_styles["Normal"],
                fontName="Helvetica",
                fontSize=6.8,
                leading=8,
                textColor=COLOR_SLATE,
                alignment=1,
            ),
            "SectionHeader": ParagraphStyle(
                "SectionHeader",
                parent=base_styles["Heading2"],
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=12,
                textColor=COLOR_NAVY,
                spaceBefore=6,
                spaceAfter=4,
            ),
            "TableHead": ParagraphStyle(
                "TableHead",
                parent=base_styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=7.5,
                leading=9,
                textColor=colors.white,
            ),
            "TableCell": ParagraphStyle(
                "TableCell",
                parent=base_styles["Normal"],
                fontName="Helvetica",
                fontSize=7.5,
                leading=9.5,
                textColor=COLOR_TEXT_MAIN,
            ),
            "TableCellRight": ParagraphStyle(
                "TableCellRight",
                parent=base_styles["Normal"],
                fontName="Helvetica",
                fontSize=7.5,
                leading=9.5,
                textColor=COLOR_TEXT_MAIN,
                alignment=2,
            ),
            "TableCellBoldRight": ParagraphStyle(
                "TableCellBoldRight",
                parent=base_styles["Normal"],
                fontName="Helvetica-Bold",
                fontSize=7.5,
                leading=9.5,
                textColor=COLOR_NAVY,
                alignment=2,
            ),
        }
        return styles

    @classmethod
    def generate_pdf(
        cls,
        report_title: str,
        jurisdiction: str,
        reporting_period: str,
        recipient_email: str,
        summary_cards: List[Dict[str, str]],
        sections: Optional[List[Dict[str, Any]]] = None,
        table_headers: Optional[List[Dict[str, str]]] = None,
        table_rows: Optional[List[Dict[str, Any]]] = None,
    ) -> bytes:
        """
        Generate high-resolution PDF document matching institutional design guidelines.
        Returns raw PDF bytes.
        """
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = cls._create_styles()
        story = []
        page_width = A4[0] - 72  # 595.27 - 72 = 523.27 pt usable width

        # ---------------------------------------------------------
        # 1. Institutional Header Banner
        # ---------------------------------------------------------
        gen_timestamp = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

        left_header_data = [
            [Paragraph("GOVERNMENT OF INDIA &bull; LAW ENFORCEMENT INTELLIGENCE", styles["OrgSuper"])],
            [Paragraph(report_title, styles["ReportTitle"])],
            [Paragraph(jurisdiction, styles["JurisdictionSubtitle"])],
        ]
        left_table = Table(left_header_data, colWidths=[310])
        left_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))

        right_meta_data = [
            [Paragraph("Reporting Period:", styles["MetaLabel"]), Paragraph(reporting_period, styles["MetaValue"])],
            [Paragraph("Generated:", styles["MetaLabel"]), Paragraph(gen_timestamp, styles["MetaValue"])],
            [Paragraph("Recipient:", styles["MetaLabel"]), Paragraph(recipient_email, styles["MetaValue"])],
        ]
        right_table = Table(right_meta_data, colWidths=[75, 138])
        right_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ("LEFTPADDING", (0, 0), (-1, -1), 2),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("ALIGN", (0, 0), (0, -1), "RIGHT"),
        ]))

        header_table = Table([[left_table, right_table]], colWidths=[310, 213.27])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(header_table)

        # Subtle divider
        story.append(Spacer(1, 3))
        story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceBefore=0, spaceAfter=8))

        # ---------------------------------------------------------
        # 2. Four Compact Summary Cards
        # ---------------------------------------------------------
        if summary_cards and len(summary_cards) > 0:
            card_cells = []
            col_width = page_width / min(len(summary_cards), 4)

            for card in summary_cards[:4]:
                cell_content = [
                    Paragraph(card.get("title", ""), styles["CardTitle"]),
                    Spacer(1, 2),
                    Paragraph(card.get("value", "—"), styles["CardValue"]),
                    Spacer(1, 1),
                    Paragraph(card.get("subtext", ""), styles["CardSubtext"]),
                ]
                card_cells.append(cell_content)

            cards_table = Table([card_cells], colWidths=[col_width] * len(card_cells))
            cards_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), COLOR_BG_CARD),
                ("BOX", (0, 0), (-1, -1), 0.75, COLOR_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]))
            story.append(cards_table)
            story.append(Spacer(1, 10))

        # ---------------------------------------------------------
        # 3. Report Sections (Comprehensive or Specialized)
        # ---------------------------------------------------------
        if sections and len(sections) > 0:
            # Multi-section report (e.g. Comprehensive Crime Report)
            for idx, sec in enumerate(sections):
                title = sec.get("title", f"Section {idx+1}")
                story.append(Paragraph(title, styles["SectionHeader"]))

                # Section description or summary line if present
                sec_sub = sec.get("summary")
                if sec_sub:
                    story.append(Paragraph(sec_sub, styles["TableCell"]))
                    story.append(Spacer(1, 3))

                # Tables within section
                sec_tables = sec.get("tables", [])
                for t in sec_tables:
                    sub_title = t.get("sub_title")
                    if sub_title:
                        story.append(Paragraph(f"<b>{sub_title}</b>", styles["TableCell"]))
                        story.append(Spacer(1, 2))

                    headers = t.get("headers", [])
                    rows = t.get("rows", [])
                    if headers and rows:
                        story.append(cls._build_data_table(headers, rows, styles, page_width))
                        story.append(Spacer(1, 6))

                story.append(Spacer(1, 4))

        elif table_headers and table_rows:
            # Single-table specialized report (e.g. Crime Statistics, Risk Assessment)
            story.append(cls._build_data_table(table_headers, table_rows, styles, page_width))
            story.append(Spacer(1, 10))

        # Build document
        doc.build(story, canvasmaker=NumberedCanvas)
        return buf.getvalue()

    @classmethod
    def _build_data_table(
        cls,
        headers: List[Dict[str, str]],
        rows: List[Dict[str, Any]],
        styles: Dict[str, ParagraphStyle],
        page_width: float,
    ) -> Table:
        """Constructs a responsive, neatly styled ReportLab Table from header and row objects."""
        num_cols = len(headers)
        if num_cols == 0:
            return Table([[]])

        # Distribute column widths dynamically
        # First column (text/name) typically receives slightly wider allocation
        col_widths = []
        if num_cols == 1:
            col_widths = [page_width]
        elif num_cols == 2:
            col_widths = [page_width * 0.65, page_width * 0.35]
        elif num_cols == 3:
            col_widths = [page_width * 0.50, page_width * 0.25, page_width * 0.25]
        elif num_cols == 4:
            col_widths = [page_width * 0.40, page_width * 0.20, page_width * 0.20, page_width * 0.20]
        else:
            w_first = page_width * 0.32
            w_rest = (page_width - w_first) / (num_cols - 1)
            col_widths = [w_first] + [w_rest] * (num_cols - 1)

        # Header Row
        header_cells = []
        for h in headers:
            align = h.get("align", "left")
            style_h = styles["TableHead"]
            if align == "right":
                style_h = ParagraphStyle(
                    f"TH_{h.get('key')}",
                    parent=styles["TableHead"],
                    alignment=2,
                )
            header_cells.append(Paragraph(h.get("label", ""), style_h))

        table_data = [header_cells]

        # Data Rows (limit to top 40 for optimal PDF pagination)
        max_rows = 40
        for r_idx, r in enumerate(rows[:max_rows]):
            row_cells = []
            for h in headers:
                key = h.get("key", "")
                align = h.get("align", "left")
                raw_val = r.get(key, "—")
                val_str = str(raw_val) if raw_val is not None else "—"

                style_c = styles["TableCellRight"] if align == "right" else styles["TableCell"]
                row_cells.append(Paragraph(val_str, style_c))
            table_data.append(row_cells)

        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        # Apply striped styling
        t_style = [
            ("BACKGROUND", (0, 0), (-1, 0), COLOR_BG_TH),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ALIGN", (0, 0), (-1, 0), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 3.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ("BOX", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, COLOR_BORDER),
        ]

        # Alternating row colors
        for i in range(1, len(table_data)):
            if i % 2 == 0:
                t_style.append(("BACKGROUND", (0, i), (-1, i), COLOR_BG_ROW_ALT))

        table.setStyle(TableStyle(t_style))
        return table
