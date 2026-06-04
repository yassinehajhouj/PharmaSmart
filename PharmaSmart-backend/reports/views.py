"""
Reports API — computes real KPIs from pharmacy DB data.
All queries are scoped to the authenticated pharmacist's pharmacy.
"""
from __future__ import annotations

import logging
from calendar import monthrange
from datetime import date, timedelta

from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from orders.models import LigneCommande, Commande
from inventory.models import Stock

logger = logging.getLogger(__name__)

VALID_STATUTS = ['CONFIRMEE', 'EN_PREPARATION', 'PRETE', 'EN_LIVRAISON', 'LIVREE']

MONTH_FR = {
    1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr',
    5: 'Mai', 6: 'Jun', 7: 'Jul', 8: 'Aoû',
    9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc',
}

DAY_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
CHART_COLORS = ['#0B6E4F', '#1B4965', '#14A76C', '#62B6CB', '#F39C12', '#95a5a6', '#9B59B6', '#E74C3C']


# ── helpers ───────────────────────────────────────────────────────────────────

def _get_pharmacie(request):
    """Resolve the pharmacy for the logged-in pharmacist or staff member."""
    try:
        return request.user.pharmacy_profile
    except Exception:
        pass
    try:
        return request.user.personnel_profile.pharmacie
    except Exception:
        pass
    return None


def _get_period_bounds(period: str) -> tuple[date, date]:
    today = timezone.now().date()
    if period == 'month':
        start = today.replace(day=1)
    elif period == 'quarter':
        q_start_month = ((today.month - 1) // 3) * 3 + 1
        start = today.replace(month=q_start_month, day=1)
    else:  # year
        start = today.replace(month=1, day=1)
    return start, today


def _revenue_evolution(pharmacie_id: int) -> list[dict]:
    """Monthly revenue for the last 6 months (including current)."""
    today = timezone.now().date()
    result = []
    for i in range(5, -1, -1):
        month = today.month - i
        year  = today.year
        while month <= 0:
            month += 12
            year  -= 1
        month_start = date(year, month, 1)
        month_end   = date(year, month, monthrange(year, month)[1])
        ca = (
            LigneCommande.objects
            .filter(
                commande__pharmacie_id=pharmacie_id,
                commande__statut__in=VALID_STATUTS,
                commande__created_at__date__gte=month_start,
                commande__created_at__date__lte=month_end,
            )
            .aggregate(total=Sum('sous_total'))['total']
        ) or 0
        result.append({'mois': MONTH_FR[month], 'ca': float(ca)})
    return result


def _compute_kpis(pharmacie_id: int, start: date, end: date) -> dict:
    lines_qs = LigneCommande.objects.filter(
        commande__pharmacie_id=pharmacie_id,
        commande__statut__in=VALID_STATUTS,
        commande__created_at__date__gte=start,
        commande__created_at__date__lte=end,
    )
    ca                = lines_qs.aggregate(t=Sum('sous_total'))['t'] or 0
    medicaments_vendus = lines_qs.aggregate(t=Sum('quantite'))['t'] or 0

    commandes = Commande.objects.filter(
        pharmacie_id=pharmacie_id,
        statut__in=VALID_STATUTS,
        created_at__date__gte=start,
        created_at__date__lte=end,
    ).count()

    stocks = Stock.objects.filter(pharmacie_id=pharmacie_id).select_related('medicament')
    valeur_stock = sum(s.quantite * float(s.prix_effectif) for s in stocks)

    return {
        'ca':                 float(ca),
        'commandes':          commandes,
        'medicaments_vendus': int(medicaments_vendus),
        'valeur_stock':       round(valeur_stock, 2),
        'panier_moyen':       round(float(ca) / commandes, 2) if commandes else 0,
    }


def _percent_change(current: float, previous: float) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


def _previous_period_bounds(start: date, end: date) -> tuple[date, date]:
    days = (end - start).days + 1
    previous_end = start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=days - 1)
    return previous_start, previous_end


def _sales_by_category(pharmacie_id: int, start: date, end: date) -> list[dict]:
    rows = (
        LigneCommande.objects
        .filter(
            commande__pharmacie_id=pharmacie_id,
            commande__statut__in=VALID_STATUTS,
            commande__created_at__date__gte=start,
            commande__created_at__date__lte=end,
        )
        .values('medicament__categorie__nom')
        .annotate(total_vendu=Sum('quantite'), total_revenu=Sum('sous_total'))
        .order_by('-total_vendu')
    )
    return [
        {
            'name': row['medicament__categorie__nom'] or 'Sans catégorie',
            'value': int(row['total_vendu'] or 0),
            'revenu': float(row['total_revenu'] or 0),
            'color': CHART_COLORS[index % len(CHART_COLORS)],
        }
        for index, row in enumerate(rows)
    ]


def _daily_sales(pharmacie_id: int, start: date, end: date) -> list[dict]:
    totals = {label: 0 for label in DAY_FR}
    rows = (
        LigneCommande.objects
        .filter(
            commande__pharmacie_id=pharmacie_id,
            commande__statut__in=VALID_STATUTS,
            commande__created_at__date__gte=start,
            commande__created_at__date__lte=end,
        )
        .values('commande__created_at__date')
        .annotate(total_vendu=Sum('quantite'))
    )
    for row in rows:
        order_date = row['commande__created_at__date']
        totals[DAY_FR[order_date.weekday()]] += int(row['total_vendu'] or 0)
    return [{'jour': day, 'ventes': total} for day, total in totals.items()]


def _stock_by_category(pharmacie_id: int) -> list[dict]:
    totals = {}
    stocks = (
        Stock.objects
        .filter(pharmacie_id=pharmacie_id)
        .select_related('medicament', 'medicament__categorie')
    )
    for stock in stocks:
        category = stock.medicament.categorie.nom if stock.medicament.categorie else 'Sans catégorie'
        totals[category] = totals.get(category, 0) + stock.quantite * float(stock.prix_effectif)
    return [
        {'categorie': category, 'valeur': round(value, 2)}
        for category, value in sorted(totals.items(), key=lambda item: item[1], reverse=True)
    ]


def _top_medicaments(pharmacie_id: int, start: date, end: date, limit: int = 10) -> list:
    rows = (
        LigneCommande.objects
        .filter(
            commande__pharmacie_id=pharmacie_id,
            commande__statut__in=VALID_STATUTS,
            commande__created_at__date__gte=start,
            commande__created_at__date__lte=end,
        )
        .values('medicament__nom', 'medicament__categorie__nom')
        .annotate(total_vendu=Sum('quantite'), total_revenu=Sum('sous_total'))
        .order_by('-total_revenu')[:limit]
    )
    return [
        {
            'medicament__nom':          r['medicament__nom'],
            'medicament__categorie__nom': r.get('medicament__categorie__nom') or '—',
            'total_vendu':              int(r['total_vendu'] or 0),
            'total_revenu':             float(r['total_revenu'] or 0),
        }
        for r in rows
    ]


def _stock_analytics(pharmacie_id: int) -> dict:
    stocks = (
        Stock.objects
        .filter(pharmacie_id=pharmacie_id)
        .select_related('medicament', 'medicament__categorie')
        .order_by('medicament__nom')
    )
    items = []
    for s in stocks:
        prix   = float(s.prix_effectif)
        valeur = round(prix * s.quantite, 2)
        if s.quantite == 0:
            statut = 'Rupture'
        elif s.is_low_stock:
            statut = 'Bas'
        else:
            statut = 'Normal'
        items.append({
            'nom':          s.medicament.nom,
            'categorie':    s.medicament.categorie.nom if s.medicament.categorie else '—',
            'quantite':     s.quantite,
            'seuil_alerte': s.seuil_alerte,
            'prix_vente':   prix,
            'valeur':       valeur,
            'statut':       statut,
        })
    return {
        'items':        items,
        'total_valeur': round(sum(i['valeur'] for i in items), 2),
        'nb_articles':  len(items),
        'nb_rupture':   sum(1 for i in items if i['statut'] == 'Rupture'),
        'nb_bas':       sum(1 for i in items if i['statut'] == 'Bas'),
    }


def _build_report_data(pharmacie_id: int, period: str) -> dict:
    start, end     = _get_period_bounds(period)
    kpis           = _compute_kpis(pharmacie_id, start, end)
    previous_start, previous_end = _previous_period_bounds(start, end)
    previous_kpis = _compute_kpis(pharmacie_id, previous_start, previous_end)
    rev_evolution  = _revenue_evolution(pharmacie_id)
    top_meds       = _top_medicaments(pharmacie_id, start, end)
    stock          = _stock_analytics(pharmacie_id)
    return {
        'kpis':             kpis,
        'previous_kpis':    previous_kpis,
        'changes': {
            'ca': _percent_change(kpis['ca'], previous_kpis['ca']),
            'medicaments_vendus': _percent_change(kpis['medicaments_vendus'], previous_kpis['medicaments_vendus']),
            'panier_moyen': _percent_change(kpis['panier_moyen'], previous_kpis['panier_moyen']),
            'valeur_stock': 0,
        },
        'revenue_evolution': rev_evolution,
        'sales_by_category': _sales_by_category(pharmacie_id, start, end),
        'daily_sales':      _daily_sales(pharmacie_id, start, end),
        'stock_by_category': _stock_by_category(pharmacie_id),
        'top_medicaments':  top_meds,
        'stock_details':    stock['items'],
        'stock_summary':    {
            'total_valeur': stock['total_valeur'],
            'nb_articles':  stock['nb_articles'],
            'nb_rupture':   stock['nb_rupture'],
            'nb_bas':       stock['nb_bas'],
        },
    }


# ── views ─────────────────────────────────────────────────────────────────────

class ReportDataView(APIView):
    """Return all KPIs and chart data as JSON for the given period."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie = _get_pharmacie(request)
        if pharmacie is None:
            return Response(
                {'error': 'Profil pharmacie introuvable.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        period      = request.query_params.get('period', 'month')
        report_type = request.query_params.get('type', 'general')
        start, end  = _get_period_bounds(period)

        try:
            data = _build_report_data(pharmacie.id, period)
            data['pharmacie']    = pharmacie.nom_pharmacie
            data['period']       = period
            data['report_type']  = report_type
            data['period_start'] = start.isoformat()
            data['period_end']   = end.isoformat()
            return Response(data)
        except Exception as exc:
            logger.exception(f"ReportDataView error for pharmacy {pharmacie.id}: {exc}")
            return Response(
                {'error': f'Erreur lors du calcul du rapport: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ReportExportView(APIView):
    """Stream a PDF or Excel file for the current report."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie = _get_pharmacie(request)
        if pharmacie is None:
            return Response(
                {'error': 'Profil pharmacie introuvable.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        period      = request.query_params.get('period', 'month')
        report_type = request.query_params.get('type', 'general')
        fmt         = request.query_params.get('fmt', 'pdf')   # avoid DRF's ?format= interception

        try:
            data = _build_report_data(pharmacie.id, period)

            if fmt == 'excel':
                from .exporters.excel import generate_excel
                buf = generate_excel(pharmacie, period, report_type, data)
                response = HttpResponse(
                    buf.getvalue(),
                    content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                )
                response['Content-Disposition'] = (
                    f'attachment; filename="rapport_{report_type}_{period}.xlsx"'
                )
            else:
                from .exporters.pdf import generate_pdf
                buf = generate_pdf(pharmacie, period, report_type, data)
                response = HttpResponse(buf.getvalue(), content_type='application/pdf')
                response['Content-Disposition'] = (
                    f'attachment; filename="rapport_{report_type}_{period}.pdf"'
                )

            logger.info(
                f"Export {fmt.upper()} for pharmacy {pharmacie.id}: "
                f"type={report_type} period={period}"
            )
            return response

        except Exception as exc:
            logger.exception(f"ReportExportView error for pharmacy {pharmacie.id}: {exc}")
            return Response(
                {'error': f'Erreur lors de la génération du fichier: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
