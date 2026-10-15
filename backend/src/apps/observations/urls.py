from django.urls import path

from . import views

urlpatterns = [
    path("sky-stream", views.sky_stream_view),
    path("stats", views.stats_view),
    path("suggestions/week", views.suggestions_week_view),
    path("suggestions", views.suggestions_view),
    path("<int:pk>", views.observation_item_view),
]
