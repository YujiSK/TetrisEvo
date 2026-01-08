"""
Test suite for backend server
"""

import json
import os
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Set up test paths before importing server
os.environ["TESTING"] = "1"

from server import app, WEIGHTS_PATH, LOGS_PATH


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def temp_weights(tmp_path):
    """Create temporary weights file"""
    weights_file = tmp_path / "weights.json"
    weights = {
        "linesCleared": 0.5,
        "holes": -0.5,
        "aggregateHeight": -0.5,
        "bumpiness": -0.5,
        "maxHeight": -0.1,
        "wells": -0.1,
    }
    with open(weights_file, "w") as f:
        json.dump(weights, f)
    return weights_file


class TestHealth:
    def test_health_check(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data


class TestLog:
    def test_post_log(self, client):
        game_result = {
            "gameId": "test-123",
            "seed": 12345,
            "startedAt": "2024-01-01T00:00:00Z",
            "endedAt": "2024-01-01T00:05:00Z",
            "lines": 10,
            "pieces": 50,
            "score": 1000,
            "deathMaxHeight": 18,
            "weightsVersion": "abc12345",
        }
        
        response = client.post("/log", json=game_result)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["gameId"] == "test-123"

    def test_post_log_invalid(self, client):
        # Missing required fields
        invalid_result = {
            "gameId": "test-123",
            # missing other fields
        }
        
        response = client.post("/log", json=invalid_result)
        assert response.status_code == 422  # Validation error


class TestWeights:
    def test_get_weights(self, client):
        response = client.get("/weights")
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields
        assert "linesCleared" in data
        assert "holes" in data
        assert "aggregateHeight" in data
        assert "bumpiness" in data
        assert "maxHeight" in data
        assert "wells" in data


class TestSummary:
    def test_get_summary_empty(self, client):
        response = client.get("/summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "totalGames" in data
        assert "avgLines" in data
        assert "avgPieces" in data

    def test_get_summary_with_n(self, client):
        response = client.get("/summary?n=50")
        assert response.status_code == 200
        data = response.json()
        assert data["recentGames"] <= 50
