"""Test health endpoints."""

from fastapi.testclient import TestClient


def test_health_live(client: TestClient):
    """Test /health/live returns 200 with live status."""
    response = client.get("/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "live"
    assert "app" in data
    assert "X-Request-ID" in response.headers


def test_health_ready(client: TestClient):
    """Test /health/ready returns 200."""
    response = client.get("/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
