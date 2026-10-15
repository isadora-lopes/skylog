import logging
import time
from datetime import date, datetime, timedelta
from urllib.parse import urlencode

import requests

logger = logging.getLogger(__name__)

HORIZONS_URL = "https://ssd.jpl.nasa.gov/api/horizons.api"
BODIES = [
    {"id": "301", "name": "Lua"},
    {"id": "199", "name": "Mercúrio"},
    {"id": "299", "name": "Vênus"},
    {"id": "499", "name": "Marte"},
    {"id": "599", "name": "Júpiter"},
    {"id": "699", "name": "Saturno"},
    {"id": "799", "name": "Urano"},
    {"id": "899", "name": "Netuno"},
]
QUANTITIES = "4,9,10"
TIMEOUT_SEC = 12
REQUEST_SPACING_SEC = 0.35
MAX_RETRIES = 2
RETRY_BASE_DELAY_SEC = 0.8


def _quote(value: str) -> str:
    return f"'{value}'"


def _add_one_day(yyyy_mm_dd: str) -> str:
    d = datetime.strptime(yyyy_mm_dd, "%Y-%m-%d").date()
    return (d + timedelta(days=1)).isoformat()


def _add_days(yyyy_mm_dd: str, days: int) -> str:
    d = datetime.strptime(yyyy_mm_dd, "%Y-%m-%d").date()
    return (d + timedelta(days=days)).isoformat()


def _build_url(body_id: str, lat: float, lon: float, start_time: str, stop_time: str, step_size: str) -> str:
    params = {
        "format": "json",
        "COMMAND": _quote(body_id),
        "OBJ_DATA": _quote("NO"),
        "MAKE_EPHEM": _quote("YES"),
        "EPHEM_TYPE": _quote("OBSERVER"),
        "CENTER": _quote("coord@399"),
        "COORD_TYPE": _quote("GEODETIC"),
        "SITE_COORD": _quote(f"{lon},{lat},0"),
        "START_TIME": _quote(start_time),
        "STOP_TIME": _quote(stop_time),
        "STEP_SIZE": _quote(step_size),
        "QUANTITIES": _quote(QUANTITIES),
        "CSV_FORMAT": _quote("YES"),
        "ANG_FORMAT": _quote("DEG"),
        "APPARENT": _quote("AIRLESS"),
        "SKIP_DAYLT": _quote("NO"),
    }
    return f"{HORIZONS_URL}?{urlencode(params)}"


def _extract_data_lines(result_text: str) -> list[str]:
    start_idx = result_text.find("$$SOE")
    end_idx = result_text.find("$$EOE")
    if start_idx == -1 or end_idx == -1:
        return []
    block = result_text[start_idx + 5 : end_idx].strip()
    if not block:
        return []
    return [line.strip() for line in block.split("\n") if line.strip()]


def _parse_line(line: str) -> dict:
    cols = [c.strip() for c in line.split(",")]
    numeric = [
        None if v in ("", "n.a.") else float(v)
        for v in cols[3:]
    ]
    azimuth = numeric[0] if len(numeric) > 0 else None
    elevation = numeric[1] if len(numeric) > 1 else None
    magnitude = numeric[2] if len(numeric) > 2 else None
    illumination = numeric[3] if len(numeric) > 3 else None
    return {
        "time": cols[0],
        "azimuth": azimuth,
        "elevation": elevation,
        "magnitude": magnitude,
        "illumination": illumination,
    }


def _round1(n):
    return round(n * 10) / 10


def _round2(n):
    return round(n * 100) / 100


def _request_horizons(url: str) -> dict:
    try:
        response = requests.get(url, timeout=TIMEOUT_SEC)
    except requests.Timeout:
        return {"ok": False, "retryable": False, "error": "Tempo limite excedido ao consultar a NASA Horizons."}
    except requests.RequestException:
        return {"ok": False, "retryable": True, "error": "Falha de rede ao consultar a NASA Horizons."}

    if not response.ok:
        retryable = response.status_code in (429, 503) or response.status_code >= 500
        return {"ok": False, "retryable": retryable, "error": f"NASA Horizons retornou status {response.status_code}."}

    try:
        payload = response.json()
    except ValueError:
        return {"ok": False, "retryable": True, "error": "Resposta inválida da NASA Horizons."}

    if payload.get("error"):
        return {"ok": False, "retryable": False, "error": payload["error"]}

    return {"ok": True, "payload": payload}


def _request_with_retry(url: str) -> dict:
    result = None
    for attempt in range(MAX_RETRIES + 1):
        result = _request_horizons(url)
        if result["ok"] or not result.get("retryable"):
            break
        if attempt < MAX_RETRIES:
            time.sleep(RETRY_BASE_DELAY_SEC * (attempt + 1))
    return result


def _fetch_body_visibility(body_id: str, name: str, lat: float, lon: float, day: str) -> dict:
    start_time = f"{day} 18:00"
    stop_time = f"{_add_one_day(day)} 06:00"
    url = _build_url(body_id, lat, lon, start_time, stop_time, "30 min")
    result = _request_with_retry(url)
    if not result["ok"]:
        logger.error("[Horizons] Falha para %s: %s", name, result["error"])
        return {"name": name, "visible": False, "error": result["error"]}

    lines = _extract_data_lines(result["payload"].get("result") or "")
    if not lines:
        return {"name": name, "visible": False, "error": "Sem dados de efeméride retornados."}

    points = [p for p in (_parse_line(line) for line in lines) if p["elevation"] is not None]
    if not points:
        return {"name": name, "visible": False, "error": "Sem dados de elevação válidos."}

    best = max(points, key=lambda p: p["elevation"])
    return {
        "name": name,
        "visible": best["elevation"] > 0,
        "bestTime": best["time"],
        "maxElevation": _round1(best["elevation"]),
        "azimuth": _round1(best["azimuth"]) if best["azimuth"] is not None else None,
        "magnitude": _round2(best["magnitude"]) if best["magnitude"] is not None else None,
        "illumination": _round2(best["illumination"]) if best["illumination"] is not None else None,
    }


_day_cache = None
_week_cache = None


def _day_cache_instance():
    global _day_cache
    if _day_cache is None:
        from django.conf import settings

        from apps.observations.integrations.cache_utils import TTLCache

        _day_cache = TTLCache(settings.HORIZONS_CACHE_TTL)
    return _day_cache


def _week_cache_instance():
    global _week_cache
    if _week_cache is None:
        from django.conf import settings

        from apps.observations.integrations.cache_utils import TTLCache

        _week_cache = TTLCache(settings.HORIZONS_CACHE_TTL)
    return _week_cache


def _get_visible_bodies_uncached(lat: float, lon: float, day: str) -> list[dict]:
    tasks = []
    for i, body in enumerate(BODIES):
        if i > 0:
            time.sleep(REQUEST_SPACING_SEC)
        tasks.append(_fetch_body_visibility(body["id"], body["name"], lat, lon, day))

    resolved = tasks
    resolved.sort(
        key=lambda b: (
            0 if b.get("visible") else 1,
            -(b.get("maxElevation") if b.get("maxElevation") is not None else -999),
        )
    )
    return resolved


def get_visible_bodies(lat: float, lon: float, day: str) -> list[dict]:
    key = f"day:{round(lat, 4)}:{round(lon, 4)}:{day}"
    return _day_cache_instance().get_or_set(
        key, lambda: _get_visible_bodies_uncached(lat, lon, day)
    )


MONTHS = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12}


def _night_key_from_horizons_time(horizons_time_str: str, base_date: str) -> str:
    parts = horizons_time_str.strip().split(" ")
    date_part = parts[0]
    time_part = parts[1] if len(parts) > 1 else "00:00"
    hh = int(time_part.split(":")[0])
    y, mon, d = date_part.split("-")
    parsed = date(int(y), MONTHS[mon], int(d))
    if hh < 12:
        parsed = parsed - timedelta(days=1)
    key = parsed.isoformat()
    return key if key >= base_date else base_date


def _fetch_body_weekly(body_id: str, name: str, lat: float, lon: float, start_date: str, days: int) -> dict:
    start_time = f"{start_date} 18:00"
    stop_time = f"{_add_days(start_date, days)} 06:00"
    url = _build_url(body_id, lat, lon, start_time, stop_time, "1 h")
    result = _request_with_retry(url)
    if not result["ok"]:
        return {"name": name, "error": result["error"], "nights": []}

    lines = _extract_data_lines(result["payload"].get("result") or "")
    if not lines:
        return {"name": name, "error": "Sem dados de efeméride retornados.", "nights": []}

    points = [p for p in (_parse_line(line) for line in lines) if p["elevation"] is not None]
    if not points:
        return {"name": name, "error": "Sem dados de elevação válidos.", "nights": []}

    by_night: dict[str, dict] = {}
    for p in points:
        night_key = _night_key_from_horizons_time(p["time"], start_date)
        current = by_night.get(night_key)
        if not current or p["elevation"] > current["elevation"]:
            by_night[night_key] = p

    nights = []
    for night_date, best in sorted(by_night.items()):
        nights.append(
            {
                "date": night_date,
                "visible": best["elevation"] > 0,
                "bestTime": best["time"],
                "maxElevation": _round1(best["elevation"]),
                "azimuth": _round1(best["azimuth"]) if best["azimuth"] is not None else None,
                "magnitude": _round2(best["magnitude"]) if best["magnitude"] is not None else None,
                "illumination": _round2(best["illumination"]) if best["illumination"] is not None else None,
            }
        )
    return {"name": name, "error": None, "nights": nights}


def _get_weekly_visibility_uncached(lat: float, lon: float, start_date: str, days: int = 7) -> list[dict]:
    resolved = []
    for i, body in enumerate(BODIES):
        if i > 0:
            time.sleep(REQUEST_SPACING_SEC)
        resolved.append(_fetch_body_weekly(body["id"], body["name"], lat, lon, start_date, days))

    output = []
    for body in resolved:
        if body.get("error"):
            output.append(
                {
                    "name": body["name"],
                    "visible": False,
                    "error": body["error"],
                    "bestNight": None,
                    "nights": [],
                }
            )
            continue
        visible_nights = [n for n in body["nights"] if n["visible"]]
        best_night = max(visible_nights, key=lambda n: n["maxElevation"], default=None)
        output.append(
            {
                "name": body["name"],
                "visible": len(visible_nights) > 0,
                "bestNight": best_night,
                "visibleNightsCount": len(visible_nights),
                "nights": body["nights"],
                "error": None,
            }
        )

    output.sort(
        key=lambda b: (
            0 if b.get("visible") else 1,
            -(b.get("bestNight") or {}).get("maxElevation", -999),
        )
    )
    return output


def get_weekly_visibility(lat: float, lon: float, start_date: str, days: int = 7) -> list[dict]:
    key = f"week:{round(lat, 4)}:{round(lon, 4)}:{start_date}:{days}"
    return _week_cache_instance().get_or_set(
        key, lambda: _get_weekly_visibility_uncached(lat, lon, start_date, days)
    )
