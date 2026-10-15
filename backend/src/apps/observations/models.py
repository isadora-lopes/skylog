from django.conf import settings
from django.db import models


class SkyCondition(models.TextChoices):
    EXCELLENT = "Excelente", "Excelente"
    GOOD = "Bom", "Bom"
    FAIR = "Regular", "Regular"
    POOR = "Ruim", "Ruim"


def observation_photo_path(instance, filename):
    return f"observations/user_{instance.user_id}/{filename}"


class Observation(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="observations")
    object = models.CharField(max_length=120)
    date = models.DateTimeField()
    equipment = models.CharField(max_length=100)
    conditions = models.CharField(max_length=20, choices=SkyCondition.choices)
    location_name = models.CharField(max_length=200, blank=True, default="")
    location_lat = models.FloatField(null=True, blank=True)
    location_lon = models.FloatField(null=True, blank=True)
    notes = models.TextField(max_length=2000, blank=True, default="")
    photo = models.ImageField(upload_to=observation_photo_path, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]
        indexes = [
            models.Index(fields=["user", "-date"]),
            models.Index(fields=["user", "object"]),
        ]

    @property
    def location(self):
        return {
            "name": self.location_name,
            "lat": self.location_lat,
            "lon": self.location_lon,
        }
