from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from apps.observations.views import health_view, observation_collection_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health", health_view),
    path("api/auth/", include("apps.users.urls")),
    path("api/observations", observation_collection_view),
    path("api/observations/", include("apps.observations.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
