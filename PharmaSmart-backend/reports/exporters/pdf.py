"""
PDF export using ReportLab — produces a styled A4 PDF from report data.
"""
from __future__ import annotations

from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable,
)

# ── brand colours ─────────────────────────────────────────────────────────────
_GREEN = colors.HexColor('#0B6E4F')
_DARK  = colors.HexColor('#1B4965')
_LIGHT = colors.HexColor('#E8F5F0')
_GREY  = colors.HexColor('#F5F7FA')
_WHITE = colors.white

W, H = A4
PERIOD_LABELS = {'month': 'Ce mois', 'quarter': 'Ce trimestre', 'year': 'Cette année'}


def generate_pdf(pharmacie, period: str, report_type: str, data: dict) -> BytesIO:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=1.5 * cm, leftMargin=1.5 * cm,
        topMargin=1.5 * cm, bottomMargin=1.5 * cm,
        title=f'Rapport {report_type}',
    )

    styles = getSampleStyleSheet()
    style_title   = ParagraphStyle('title',   parent=styles['Title'],   fontSize=18, textColor=_GREEN, spaceAfter=4)
    style_h2      = ParagraphStyle('h2',      parent=styles['Heading2'], fontSize=12, textColor=_DARK,  spaceAfter=6, spaceBefore=12)
    style_meta    = ParagraphStyle('meta',    parent=styles['Normal'],  fontSize=9,  textColor=colors.grey)
    style_normal  = ParagraphStyle('normal',  parent=styles['Normal'],  fontSize=10)

    story = []

    # ── Header ──
    story.append(Paragraph(
        f'Rapport {report_type.upper()} &mdash; {PERIOD_LABELS.get(period, period)}',
        style_title,
    ))
    story.append(Paragraph(
        f'Pharmacie : <b>{pharmacie.nom_pharmacie}</b> &nbsp;|&nbsp; '
        f'Généré le : {datetime.now().strftime("%d/%m/%Y à %H:%M")}',
        style_meta,
    ))
    story.append(HRFlowable(width='100%', color=_GREEN, thickness=2, spaceAfter=12))

    # ── KPIs ──
    kpis = data.get('kpis', {})
    story.append(Paragraph('Indicateurs clés', style_h2))
    kpi_rows = [
        ['Indicateur', 'Valeur'],
        ["Chiffre d'affaires",   f"{kpis.get('ca', 0):,.2f} MAD"],
        ['Commandes traitées',   str(kpis.get('commandes', 0))],
        ['Médicaments vendus',   str(kpis.get('medicaments_vendus', 0))],
        ['Valeur du stock',      f"{kpis.get('valeur_stock', 0):,.2f} MAD"],
    ]
    story.append(_make_table(kpi_rows, col_widths=[10 * cm, 6 * cm]))
    story.append(Spacer(1, 0.5 * cm))

    # ── Revenue evolution ──
    rev = data.get('revenue_evolution', [])
    if rev:
        story.append(Paragraph('Évolution du chiffre d\'affaires (6 mois)', style_h2))
        rev_rows = [['Mois', 'CA (MAD)']] + [
            [m.get('mois', ''), f"{m.get('ca', 0):,.2f}"]
            for m in rev
        ]
        story.append(_make_table(rev_rows, col_widths=[8 * cm, 8 * cm]))
        story.append(Spacer(1, 0.5 * cm))

    # ── Top medicines ──
    top = data.get('top_medicaments', [])
    if top:
        story.append(Paragraph('Top médicaments vendus', style_h2))
        top_rows = [['#', 'Médicament', 'Catégorie', 'Qté', 'Revenu (MAD)']]
        for i, med in enumerate(top, 1):
            top_rows.append([
                str(i),
                med.get('medicament__nom', ''),
                med.get('medicament__categorie__nom', '—'),
                str(med.get('total_vendu', 0)),
                f"{float(med.get('total_revenu', 0)):,.2f}",
            ])
        story.append(_make_table(top_rows, col_widths=[1*cm, 6*cm, 4*cm, 2*cm, 3.5*cm]))
        story.append(Spacer(1, 0.5 * cm))

    # ── Stock details (if requested) ──
    stock_items = data.get('stock_details', [])
    if stock_items and report_type in ('general', 'stock'):
        story.append(Paragraph('Détail du stock', style_h2))
        s_rows = [['Médicament', 'Stock', 'Seuil', 'Prix', 'Valeur (MAD)', 'Statut']]
        for s in stock_items[:30]:   # cap at 30 rows for PDF readability
            s_rows.append([
                s.get('nom', ''),
                str(s.get('quantite', 0)),
                str(s.get('seuil_alerte', 0)),
                f"{float(s.get('prix_vente', 0)):,.2f}",
                f"{float(s.get('valeur', 0)):,.2f}",
                s.get('statut', ''),
            ])
        story.append(_make_table(s_rows, col_widths=[5*cm, 2*cm, 2*cm, 2.5*cm, 3*cm, 2*cm]))

    doc.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    buf.seek(0)
    return buf


def _make_table(rows, col_widths=None):
    tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    style = TableStyle([
        # Header row
        ('BACKGROUND',  (0, 0), (-1, 0),  _GREEN),
        ('TEXTCOLOR',   (0, 0), (-1, 0),  _WHITE),
        ('FONTNAME',    (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',    (0, 0), (-1, 0),  10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING',    (0, 0), (-1, 0), 8),
        # Alternating rows
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [_WHITE, _LIGHT]),
        # Grid
        ('GRID',        (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
        ('FONTSIZE',    (0, 1), (-1, -1), 9),
        ('TOPPADDING',  (0, 1), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING',(0, 0), (-1, -1), 6),
        ('VALIGN',      (0, 0), (-1, -1), 'MIDDLE'),
    ])
    tbl.setStyle(style)
    return tbl


def _page_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.grey)
    canvas.drawString(1.5 * cm, 0.8 * cm, 'PharmaSmart — Rapport confidentiel')
    canvas.drawRightString(
        W - 1.5 * cm, 0.8 * cm,
        f'Page {doc.page}  |  {datetime.now().strftime("%d/%m/%Y")}',
    )
    canvas.restoreState()
