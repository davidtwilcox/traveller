import json

import pytest

import web.api.app as api


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(api, "DECK_FILE", tmp_path / "deck.json")
    monkeypatch.setattr(api, "ORACLE_DECK_FILE", tmp_path / "oracle_deck.json")
    api.app.config.update(TESTING=True)
    return api.app.test_client()


@pytest.mark.parametrize(
    "endpoint",
    [
        "/api/roll",
        "/api/roll-digit",
        "/api/oracle-deck/draw",
        "/api/deck/draw",
        "/api/deck/reset",
    ],
)
def test_json_endpoints_reject_non_object_json(client, endpoint):
    response = client.post(endpoint, data="[]", content_type="application/json")

    assert response.status_code == 400
    assert response.get_json() == {"error": "request body must be a JSON object"}


def test_roll_rejects_non_boolean_drop_lowest(client):
    response = client.post(
        "/api/roll",
        json={"num_dice": 2, "sides": 6, "drop_lowest": "false"},
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "drop_lowest must be a boolean"}


def test_deck_reset_rejects_non_boolean_include_jokers(client):
    response = client.post(
        "/api/deck/reset",
        json={"deck_type": "standard", "include_jokers": "false"},
    )

    assert response.status_code == 400
    assert response.get_json() == {"error": "include_jokers must be a boolean"}


def test_invalid_persisted_deck_state_is_rebuilt(client):
    api.DECK_FILE.write_text(json.dumps({"deck_type": "standard"}))

    response = client.get("/api/deck/status")

    assert response.status_code == 200
    assert response.get_json() == {
        "remaining": 52,
        "include_jokers": False,
        "deck_type": "standard",
    }


def test_roll_osr_stats_endpoint_returns_six_scores(client):
    response = client.post("/api/roll-osr-stats")

    assert response.status_code == 200
    stats = response.get_json()["stats"]
    assert len(stats) == 6
    assert all(len(stat["rolls"]) == 3 for stat in stats)
    assert all(stat["total"] == sum(stat["rolls"]) for stat in stats)
