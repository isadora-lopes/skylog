from django.apps import AppConfig


class ObservationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.observations"
    label = "observations"

    def ready(self):
        from . import signals  # noqa: F401
