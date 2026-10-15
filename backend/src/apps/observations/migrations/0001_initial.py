import apps.observations.models
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Observation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("object", models.CharField(max_length=120)),
                ("date", models.DateTimeField()),
                ("equipment", models.CharField(max_length=100)),
                (
                    "conditions",
                    models.CharField(
                        choices=[
                            ("Excelente", "Excelente"),
                            ("Bom", "Bom"),
                            ("Regular", "Regular"),
                            ("Ruim", "Ruim"),
                        ],
                        max_length=20,
                    ),
                ),
                ("location_name", models.CharField(blank=True, default="", max_length=200)),
                ("location_lat", models.FloatField(blank=True, null=True)),
                ("location_lon", models.FloatField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, default="", max_length=2000)),
                ("photo", models.ImageField(blank=True, null=True, upload_to=apps.observations.models.observation_photo_path)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="observations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-date"],
                "indexes": [
                    models.Index(fields=["user", "-date"], name="observations_user_id_date_idx"),
                    models.Index(fields=["user", "object"], name="observations_user_id_object_idx"),
                ],
            },
        ),
    ]
