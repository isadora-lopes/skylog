import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.users.models import User


@pytest.fixture
def api():
    return APIClient()


@pytest.mark.django_db
def test_register_and_login(api):
    payload = {"name": "Ada", "email": "ada@example.com", "password": "senha1234"}
    res = api.post("/api/auth/register", payload, format="json")
    assert res.status_code == 201
    assert res.data["success"] is True
    assert "token" in res.data

    res_login = api.post("/api/auth/login", {"email": payload["email"], "password": payload["password"]}, format="json")
    assert res_login.status_code == 200
    token = res_login.data["token"]
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    me = api.get("/api/auth/me")
    assert me.status_code == 200
    assert me.data["user"]["email"] == payload["email"]
