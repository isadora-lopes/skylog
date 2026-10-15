import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_health_ok():
    client = APIClient()
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.data["service"] == "skylog"
    assert res.data["database"] == "up"
    assert res.data["status"] == "ok"
