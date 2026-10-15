from datetime import date, datetime, timedelta

import requests

WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
TIMEOUT_SEC = 10

WEATHER_CODE_LABELS = {
    0: "Céu limpo",
    1: "Predomínio de céu limpo",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Névoa",
    48: "Névoa com geada",
    51: "Garoa fraca",
    53: "Garoa moderada",
    55: "Garoa forte",
    61: "Chuva fraca",
    63: "Chuva moderada",
    65: "Chuva forte",
    80: "Pancadas de chuva fracas",
    81: "Pancadas de chuva moderadas",
    82: "Pancadas de chuva fortes",
    95: "Trovoada",
    96: "Trovoada com granizo fraco",
    99: "Trovoada com granizo forte",
}


def weather_code_label(code):
    return WEATHER_CODE_LABELS.get(code, "Condição desconhecida")


def _weather_code_severity(code):
    if code in (95, 96, 99):
        return 100
    if 80 <= code <= 86:
        return 90
    if 61 <= code <= 77:
        return 80
    if 51 <= code <= 57:
        return 60
    if code in (45, 48):
        return 50
    if code == 3:
        return 30
    if code == 2:
        return 20
    if code == 1:
        return 10
    return 0


def _is_fog(code):
    return code in (45, 48)


def _is_rain(code):
    return code is not None and 51 <= code <= 86


def _is_storm(code):
    return code in (95, 96, 99)


def _add_days(yyyy_mm_dd: str, days: int) -> str:
    d = datetime.strptime(yyyy_mm_dd, "%Y-%m-%d").date()
    return (d + timedelta(days=days)).isoformat()


def _is_within_observation_window(iso_time: str, day: str) -> bool:
    t = datetime.fromisoformat(iso_time)
    window_start = datetime.fromisoformat(f"{day}T18:00:00")
    window_end = datetime.fromisoformat(f"{_add_days(day, 1)}T06:00:00")
    return window_start <= t <= window_end


def _is_within_day(iso_time: str, day: str) -> bool:
    return iso_time.startswith(day)


def _classify_sky_quality(avg_cloud_cover):
    if avg_cloud_cover is None:
        return None
    if avg_cloud_cover <= 15:
        return "Excelente"
    if avg_cloud_cover <= 40:
        return "Bom"
    if avg_cloud_cover <= 70:
        return "Regular"
    return "Ruim"


def _average(values):
    valid = [v for v in values if v is not None]
    if not valid:
        return None
    return round(sum(valid) / len(valid))


def _fetch_forecast(lat: float, lon: float):
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "cloudcover,precipitation_probability,visibility,weathercode",
        "daily": "weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,windspeed_10m_max",
        "timezone": "auto",
        "forecast_days": "7",
    }
    try:
        response = requests.get(WEATHER_URL, params=params, timeout=TIMEOUT_SEC)
    except requests.Timeout:
        return {"available": False, "error": "Tempo limite excedido ao consultar a Open-Meteo."}
    except requests.RequestException:
        return {"available": False, "error": "Falha de rede ao consultar a Open-Meteo."}

    if not response.ok:
        return {"available": False, "error": f"Open-Meteo: status {response.status_code}"}

    return {"available": True, "payload": response.json(), "date": None}


def _build_night_summary(payload, day: str):
    hourly = payload.get("hourly") or {}
    times = hourly.get("time") or []
    if not times:
        return {"available": False, "error": "Sem dados horários retornados pela Open-Meteo."}

    night_hours = []
    for i, time_str in enumerate(times):
        if not _is_within_observation_window(time_str, day):
            continue
        night_hours.append(
            {
                "time": time_str,
                "cloudcover": hourly.get("cloudcover", [None] * len(times))[i],
                "precipitation": hourly.get("precipitation_probability", [None] * len(times))[i],
                "visibility": hourly.get("visibility", [None] * len(times))[i],
                "weathercode": hourly.get("weathercode", [None] * len(times))[i],
            }
        )

    if not night_hours:
        return {
            "available": False,
            "error": "Sem dados para o período noturno solicitado. A previsão da Open-Meteo cobre cerca de 7 dias a partir de hoje.",
        }

    cloud_values = [h["cloudcover"] for h in night_hours]
    avg_cloud = _average(cloud_values)
    valid_cloud = [v for v in cloud_values if v is not None]
    min_cloud = min(valid_cloud) if valid_cloud else None
    max_cloud = max(valid_cloud) if valid_cloud else None
    precip_values = [h["precipitation"] for h in night_hours if h["precipitation"] is not None]
    max_precip = max(precip_values) if precip_values else None

    worst_code = None
    for h in night_hours:
        code = h["weathercode"]
        if code is None:
            continue
        if worst_code is None or _weather_code_severity(code) > _weather_code_severity(worst_code):
            worst_code = code

    return {
        "available": True,
        "timezone": payload.get("timezone"),
        "summary": {
            "avgCloudCover": avg_cloud,
            "minCloudCover": min_cloud,
            "maxCloudCover": max_cloud,
            "maxPrecipProbability": max_precip,
            "skyQuality": _classify_sky_quality(avg_cloud),
            "weatherCode": worst_code,
            "weatherLabel": weather_code_label(worst_code) if worst_code is not None else None,
            "hasFog": any(_is_fog(h["weathercode"]) for h in night_hours),
            "hasRain": any(_is_rain(h["weathercode"]) for h in night_hours),
            "hasStorm": any(_is_storm(h["weathercode"]) for h in night_hours),
        },
        "hourly": night_hours,
    }


def _build_daily_forecast(payload):
    daily = payload.get("daily") or {}
    hourly = payload.get("hourly") or {}
    times = daily.get("time") or []
    if not times:
        return []

    result = []
    for i, day in enumerate(times):
        code = (daily.get("weathercode") or [None] * len(times))[i]
        day_cloud = None
        if hourly.get("time") and hourly.get("cloudcover"):
            day_cloud_values = [
                hourly["cloudcover"][idx]
                for idx, t in enumerate(hourly["time"])
                if _is_within_day(t, day)
            ]
            day_cloud = _average(day_cloud_values)

        result.append(
            {
                "date": day,
                "weatherCode": code,
                "weatherLabel": weather_code_label(code) if code is not None else None,
                "temperatureMax": (daily.get("temperature_2m_max") or [None] * len(times))[i],
                "temperatureMin": (daily.get("temperature_2m_min") or [None] * len(times))[i],
                "precipitationProbability": (daily.get("precipitation_probability_max") or [None] * len(times))[i],
                "precipitationSum": (daily.get("precipitation_sum") or [None] * len(times))[i],
                "windSpeedMax": (daily.get("windspeed_10m_max") or [None] * len(times))[i],
                "cloudCoverMean": day_cloud,
                "isFog": _is_fog(code),
                "isRain": _is_rain(code),
                "isStorm": _is_storm(code),
            }
        )
    return result


_forecast_cache = None
_current_cache = None


def _forecast_cache_instance():
    global _forecast_cache
    if _forecast_cache is None:
        from django.conf import settings

        from apps.observations.integrations.cache_utils import TTLCache

        _forecast_cache = TTLCache(settings.WEATHER_FORECAST_CACHE_TTL)
    return _forecast_cache


def _current_cache_instance():
    global _current_cache
    if _current_cache is None:
        from django.conf import settings

        from apps.observations.integrations.cache_utils import TTLCache

        _current_cache = TTLCache(settings.WEATHER_CURRENT_CACHE_TTL)
    return _current_cache


def _get_night_sky_conditions_uncached(lat: float, lon: float, day: str):
    forecast = _fetch_forecast(lat, lon)
    if not forecast.get("available"):
        return forecast

    night = _build_night_summary(forecast["payload"], day)
    daily = _build_daily_forecast(forecast["payload"])
    return {**night, "daily": daily}


def get_night_sky_conditions(lat: float, lon: float, day: str):
    key = f"forecast:{round(lat, 4)}:{round(lon, 4)}:{day}"
    return _forecast_cache_instance().get_or_set(
        key, lambda: _get_night_sky_conditions_uncached(lat, lon, day)
    )


def _get_current_cloud_cover_uncached(lat: float, lon: float):
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "cloud_cover,temperature_2m,weathercode,wind_speed_10m",
        "timezone": "auto",
    }
    try:
        response = requests.get(WEATHER_URL, params=params, timeout=TIMEOUT_SEC)
    except requests.Timeout:
        return {"available": False, "error": "Tempo limite excedido ao consultar a Open-Meteo."}
    except requests.RequestException:
        return {"available": False, "error": "Falha de rede ao consultar a Open-Meteo."}

    if not response.ok:
        return {"available": False, "error": f"Open-Meteo: status {response.status_code}"}

    payload = response.json()
    current = payload.get("current")
    if not current:
        return {"available": False, "error": "Sem dados atuais retornados pela Open-Meteo."}

    cloud_cover = current.get("cloud_cover")
    code = current.get("weathercode")
    return {
        "available": True,
        "time": current.get("time"),
        "timezone": payload.get("timezone"),
        "cloudCover": cloud_cover,
        "temperature": current.get("temperature_2m"),
        "windSpeed": current.get("wind_speed_10m"),
        "weatherCode": code,
        "weatherLabel": weather_code_label(code) if code is not None else None,
        "skyQuality": _classify_sky_quality(cloud_cover),
    }


def get_current_cloud_cover(lat: float, lon: float):
    key = f"current:{round(lat, 4)}:{round(lon, 4)}"
    return _current_cache_instance().get_or_set(
        key, lambda: _get_current_cloud_cover_uncached(lat, lon)
    )
