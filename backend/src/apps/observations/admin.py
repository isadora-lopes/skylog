from django.contrib import admin

from .models import Observation


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = ("object", "user", "date", "equipment", "conditions")
    list_filter = ("conditions",)
    search_fields = ("object", "equipment", "user__email")
