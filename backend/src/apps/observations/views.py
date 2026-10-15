import json
import re
import time
from datetime import datetime

from django.db import connection
from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.users.models import User

from .integrations import horizons, weather
from .models import Observation, SkyCondition
from .serializers import ObservationSerializer, ObservationWriteSerializer
from .services import stats as stats_service

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_LIST_LIMIT = 100
SKY_STREAM_INTERVAL_SEC = 60
SKY_STREAM_HEARTBEAT_SEC = 20


@api_view(["GET"])
@permission_classes([AllowAny])
def health_view(_request):
    db_ok = True
    try:
        connection.ensure_connection()
    except Exception:
        db_ok = False
    payload = {
        "status": "ok" if db_ok else "degraded",
        "service": "skylog",
        "database": "up" if db_ok else "down",
        "time": timezone.now(),
    }
    return Response(payload, status=status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE)


def _parse_coords(lat_raw, lon_raw):
    try:
        lat = float(lat_raw)
        lon = float(lon_raw)
    except (TypeError, ValueError):
        return None, None, "Coordenadas inválidas."
    if lat < -90 or lat > 90 or lon < -180 or lon > 180:
        return None, None, "Coordenadas inválidas."
    return lat, lon, None


def _validate_date_str(day: str):
    if not day or not re.match(r"^\d{4}-\d{2}-\d{2}$", day):
        return "Data inválida. Use o formato YYYY-MM-DD."
    if parse_date(day) is None:
        return "Data inválida. Use o formato YYYY-MM-DD."
    return None


def _user_from_stream_token(request):
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    elif request.GET.get("token"):
        token = request.GET.get("token")

    if not token:
        return None, Response(
            {"success": False, "message": "Não autorizado. Faça login para continuar."},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    try:
        validated = AccessToken(token)
        user_id = validated.get("user_id")
        user = User.objects.filter(pk=user_id, is_active=True).first()
    except (InvalidToken, TokenError):
        user = None

    if not user:
        return None, Response(
            {"success": False, "message": "Token inválido."},
            status=status.HTTP_401_UNAUTHORIZED,
        )
    return user, None


@api_view(["GET"])
def sky_stream_view(request):
    user, error_response = _user_from_stream_token(request)
    if error_response:
        return error_response

    lat, lon, err = _parse_coords(request.GET.get("lat"), request.GET.get("lon"))
    if err:
        return Response({"success": False, "message": "Informe lat e lon válidos."}, status=status.HTTP_400_BAD_REQUEST)

    def event_stream():
        last_update = 0.0
        last_heartbeat = 0.0
        while True:
            now = time.time()
            if now - last_update >= SKY_STREAM_INTERVAL_SEC:
                last_update = now
                try:
                    conditions = weather.get_current_cloud_cover(lat=lat, lon=lon)
                    payload = {**conditions, "fetchedAt": timezone.now().isoformat()}
                    yield f"event: sky-update\ndata: {json.dumps(payload)}\n\n"
                except Exception:
                    yield f"event: sky-error\ndata: {json.dumps({'message': 'Falha ao consultar condições do céu.'})}\n\n"

            if now - last_heartbeat >= SKY_STREAM_HEARTBEAT_SEC:
                last_heartbeat = now
                yield ": heartbeat\n\n"

            time.sleep(1)

    response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache, no-transform"
    response["X-Accel-Buffering"] = "no"
    return response


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def observation_collection_view(request):
    if request.method == "POST":
        return create_observation_view(request)
    return list_observations_view(request)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def observation_item_view(request, pk):
    if request.method == "PUT":
        return update_observation_view(request, pk)
    if request.method == "DELETE":
        return delete_observation_view(request, pk)
    return detail_observation_view(request, pk)


def list_observations_view(request):
    qs = Observation.objects.filter(user=request.user)

    obj_filter = request.GET.get("object")
    if obj_filter:
        qs = qs.filter(object__icontains=obj_filter.strip())

    from_day = request.GET.get("from")
    to_day = request.GET.get("to")
    if from_day:
        parsed = parse_date(from_day)
        if parsed:
            qs = qs.filter(date__gte=timezone.make_aware(datetime.combine(parsed, datetime.min.time())))
    if to_day:
        parsed = parse_date(to_day)
        if parsed:
            end = datetime.combine(parsed, datetime.max.time())
            qs = qs.filter(date__lte=timezone.make_aware(end))

    try:
        page = max(1, int(request.GET.get("page", 1)))
        limit = min(MAX_LIST_LIMIT, max(1, int(request.GET.get("limit", 20))))
    except ValueError:
        return Response({"success": False, "message": "Paginação inválida."}, status=status.HTTP_400_BAD_REQUEST)

    total = qs.count()
    skip = (page - 1) * limit
    items = qs.order_by("-date")[skip : skip + limit]
    data = ObservationSerializer(items, many=True, context={"request": request}).data

    return Response(
        {
            "success": True,
            "total": total,
            "page": page,
            "totalPages": max(1, (total + limit - 1) // limit),
            "data": data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stats_view(request):
    stats = stats_service.get_stats(request.user.id)
    chart = stats_service.get_monthly_chart(request.user.id)
    return Response({"success": True, "stats": stats, "chart": chart})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def suggestions_view(request):
    lat, lon, err = _parse_coords(request.GET.get("lat"), request.GET.get("lon"))
    day = request.GET.get("date")
    if lat is None or err:
        return Response(
            {"success": False, "message": "Informe lat, lon e date (YYYY-MM-DD) para gerar sugestões."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    date_err = _validate_date_str(day)
    if date_err:
        return Response({"success": False, "message": date_err}, status=status.HTTP_400_BAD_REQUEST)

    bodies = horizons.get_visible_bodies(lat, lon, day)
    sky = weather.get_night_sky_conditions(lat, lon, day)
    return Response(
        {
            "success": True,
            "query": {"lat": lat, "lon": lon, "date": day},
            "bodies": bodies,
            "sky": sky,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def suggestions_week_view(request):
    lat, lon, err = _parse_coords(request.GET.get("lat"), request.GET.get("lon"))
    day = request.GET.get("date")
    if lat is None or err:
        return Response(
            {"success": False, "message": "Informe lat, lon e date (YYYY-MM-DD) para gerar sugestões da semana."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    date_err = _validate_date_str(day)
    if date_err:
        return Response({"success": False, "message": date_err}, status=status.HTTP_400_BAD_REQUEST)

    bodies = horizons.get_weekly_visibility(lat, lon, day, 7)
    sky = weather.get_night_sky_conditions(lat, lon, day)
    observed = stats_service.distinct_objects_lower(request.user.id)
    counts = stats_service.object_counts_lower(request.user.id)

    enriched = []
    for body in bodies:
        key = body["name"].strip().lower()
        enriched.append(
            {
                **body,
                "alreadyObserved": key in observed,
                "timesObserved": counts.get(key, 0),
            }
        )

    new_for_user = [b for b in enriched if b.get("visible") and not b["alreadyObserved"]]
    recommended = new_for_user if new_for_user else [b for b in enriched if b.get("visible")]

    return Response(
        {
            "success": True,
            "query": {"lat": lat, "lon": lon, "startDate": day, "days": 7},
            "bodies": enriched,
            "recommended": [b["name"] for b in recommended[:3]],
            "sky": sky,
            "historySummary": {"totalObservedObjects": len(observed)},
        }
    )


def detail_observation_view(request, pk):
    obs = get_object_or_404(Observation, pk=pk, user=request.user)
    return Response({"success": True, "data": ObservationSerializer(obs, context={"request": request}).data})


def _apply_write_fields(obs: Observation, data: dict):
    obs.object = data["object"].strip()
    day = data["date"]
    obs.date = timezone.make_aware(datetime.combine(day, datetime.min.time()))
    obs.equipment = data["equipment"].strip()
    obs.conditions = data["conditions"]
    obs.location_name = (data.get("location") or "").strip()
    obs.location_lat = data.get("lat")
    obs.location_lon = data.get("lon")
    obs.notes = (data.get("notes") or "").strip()


def _validate_photo(upload):
    if not upload:
        return None
    name = upload.name.lower()
    ext = "." + name.split(".")[-1] if "." in name else ""
    if ext not in ALLOWED_IMAGE_EXT:
        raise ValueError("Formato de imagem inválido. Use JPG, PNG ou WebP.")
    if upload.size > 5 * 1024 * 1024:
        raise ValueError("Imagem muito grande (máx. 5MB).")
    return upload


def create_observation_view(request):
    for field in ("object", "date", "equipment", "conditions"):
        if not request.data.get(field):
            return Response(
                {
                    "success": False,
                    "message": "Objeto, data, equipamento e condições são obrigatórios.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    write = ObservationWriteSerializer(data=request.data)
    if not write.is_valid():
        msg = next(iter(write.errors.values()))[0]
        return Response({"success": False, "message": str(msg)}, status=status.HTTP_400_BAD_REQUEST)

    try:
        photo = _validate_photo(request.FILES.get("photo"))
    except ValueError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    obs = Observation(user=request.user)
    _apply_write_fields(obs, write.validated_data)
    if photo:
        obs.photo = photo
    obs.save()

    return Response(
        {
            "success": True,
            "message": "Observação registrada com sucesso!",
            "data": ObservationSerializer(obs, context={"request": request}).data,
        },
        status=status.HTTP_201_CREATED,
    )


def update_observation_view(request, pk):
    obs = get_object_or_404(Observation, pk=pk, user=request.user)
    write = ObservationWriteSerializer(data=request.data, partial=True)
    if not write.is_valid():
        msg = next(iter(write.errors.values()))[0]
        return Response({"success": False, "message": str(msg)}, status=status.HTTP_400_BAD_REQUEST)

    data = write.validated_data
    if data:
        merged = {
            "object": data.get("object", obs.object),
            "date": data.get("date", obs.date.date()),
            "equipment": data.get("equipment", obs.equipment),
            "conditions": data.get("conditions", obs.conditions),
            "location": data.get("location", obs.location_name),
            "lat": data.get("lat", obs.location_lat),
            "lon": data.get("lon", obs.location_lon),
            "notes": data.get("notes", obs.notes),
        }
        _apply_write_fields(obs, merged)

    try:
        photo = _validate_photo(request.FILES.get("photo"))
    except ValueError as exc:
        return Response({"success": False, "message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    if photo:
        if obs.photo:
            obs.photo.delete(save=False)
        obs.photo = photo
    elif data.get("removePhoto") == "true" and obs.photo:
        obs.photo.delete(save=False)
        obs.photo = None

    obs.save()
    return Response(
        {
            "success": True,
            "message": "Observação atualizada.",
            "data": ObservationSerializer(obs, context={"request": request}).data,
        }
    )


def delete_observation_view(request, pk):
    obs = get_object_or_404(Observation, pk=pk, user=request.user)
    if obs.photo:
        obs.photo.delete(save=False)
    obs.delete()
    return Response({"success": True, "message": "Observação excluída."})
