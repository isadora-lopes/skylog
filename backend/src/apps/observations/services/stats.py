from datetime import datetime

from django.db.models import Count
from django.db.models.functions import Lower, TruncMonth
from django.utils import timezone

from apps.observations.models import Observation


def get_stats(user_id: int) -> dict:
    qs = Observation.objects.filter(user_id=user_id)
    total_obs = qs.count()
    unique_objects = qs.values("object").distinct().count()

    now = timezone.now()
    start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    observations_this_month = qs.filter(date__gte=start_month).count()

    top_equipment = list(
        qs.values("equipment")
        .annotate(count=Count("id"))
        .order_by("-count")[:3]
        .values("equipment", "count")
    )
    top_equipment = [{"name": row["equipment"], "count": row["count"]} for row in top_equipment]

    conditions_breakdown = list(
        qs.values("conditions")
        .annotate(count=Count("id"))
        .order_by("-count")
        .values("conditions", "count")
    )
    conditions_breakdown = [{"name": row["conditions"], "count": row["count"]} for row in conditions_breakdown]

    return {
        "totalObservations": total_obs,
        "uniqueObjects": unique_objects,
        "observationsThisMonth": observations_this_month,
        "topEquipment": top_equipment,
        "conditionsBreakdown": conditions_breakdown,
    }


def get_monthly_chart(user_id: int, months: int = 6) -> list[dict]:
    now = timezone.now()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month = start.month - (months - 1)
    year = start.year
    while month <= 0:
        month += 12
        year -= 1
    start = start.replace(year=year, month=month)

    rows = (
        Observation.objects.filter(user_id=user_id, date__gte=start)
        .annotate(bucket=TruncMonth("date"))
        .values("bucket")
        .annotate(count=Count("id"))
        .order_by("bucket")
    )

    chart = []
    for row in rows:
        bucket: datetime = row["bucket"]
        chart.append({"_id": {"year": bucket.year, "month": bucket.month}, "count": row["count"]})
    return chart


def distinct_objects_lower(user_id: int) -> set[str]:
    names = Observation.objects.filter(user_id=user_id).values_list("object", flat=True)
    return {name.strip().lower() for name in names if name}


def object_counts_lower(user_id: int) -> dict[str, int]:
    rows = (
        Observation.objects.filter(user_id=user_id)
        .annotate(key=Lower("object"))
        .values("key")
        .annotate(count=Count("id"))
    )
    return {row["key"]: row["count"] for row in rows}
