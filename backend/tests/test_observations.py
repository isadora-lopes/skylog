import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.observations.models import Observation, SkyCondition
from apps.users.models import User


@pytest.fixture
def auth_client(db):
    user = User.objects.create_user(name="Test", email="t@example.com", password="senha1234")
    client = APIClient()
    login = client.post("/api/auth/login", {"email": "t@example.com", "password": "senha1234"}, format="json")
    token = login.data["token"]
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client, user


@pytest.mark.django_db
def test_create_and_list_observation(auth_client):
    client, user = auth_client
    res = client.post(
        "/api/observations",
        {
            "object": "Lua",
            "date": "2024-06-01",
            "equipment": "Binóculo",
            "conditions": SkyCondition.GOOD,
            "location": "Floripa",
            "notes": "Teste",
        },
        format="json",
    )
    assert res.status_code == 201
    assert Observation.objects.filter(user=user).count() == 1

    listing = client.get("/api/observations")
    assert listing.status_code == 200
    assert listing.data["total"] == 1
