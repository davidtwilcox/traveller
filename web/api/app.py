import json
import threading
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

from traveller.cards import draw_card, new_deck
from traveller.dice import roll_dice, roll_digit_dice

app = Flask(__name__)
CORS(app)

DECK_FILE = Path(__file__).parent / "deck.json"
ORACLE_DECK_FILE = Path(__file__).parent / "oracle_deck.json"
_deck_lock = threading.Lock()
_oracle_deck_lock = threading.Lock()


def _load_state() -> dict:
    """Return {"cards": [...], "include_jokers": bool}. Creates a fresh deck if none exists."""
    if DECK_FILE.exists():
        try:
            data = json.loads(DECK_FILE.read_text())
            # Handle legacy format where the file was just a list of cards.
            if isinstance(data, list):
                return {"cards": data, "include_jokers": False}
            return data
        except Exception:
            pass
    state = {"cards": new_deck(), "include_jokers": False}
    _save_state(state)
    return state


def _save_state(state: dict) -> None:
    DECK_FILE.write_text(json.dumps(state))


def _load_oracle_state() -> dict:
    """Return oracle/generator deck state. Creates a fresh deck if none exists."""
    if ORACLE_DECK_FILE.exists():
        try:
            data = json.loads(ORACLE_DECK_FILE.read_text())
            if isinstance(data, dict) and "cards" in data:
                return data
        except Exception:
            pass
    state = {"cards": new_deck()}
    _save_oracle_state(state)
    return state


def _save_oracle_state(state: dict) -> None:
    ORACLE_DECK_FILE.write_text(json.dumps(state))


@app.route("/api/roll", methods=["POST"])
def roll():
    data = request.get_json()
    try:
        num_dice = int(data["num_dice"])
        sides = int(data["sides"])
        modifier = int(data.get("modifier") or 0)
        drop_lowest = bool(data.get("drop_lowest", False))
        advantage = data.get("advantage", "normal")

        rolls_a, total_a = roll_dice(num_dice, sides, modifier, drop_lowest=drop_lowest)

        if advantage in ("advantage", "disadvantage"):
            rolls_b, total_b = roll_dice(num_dice, sides, modifier, drop_lowest=drop_lowest)
            pick_a = (advantage == "advantage") == (total_a >= total_b)
            if pick_a:
                rolls, total, other_rolls, other_total = rolls_a, total_a, rolls_b, total_b
            else:
                rolls, total, other_rolls, other_total = rolls_b, total_b, rolls_a, total_a
            return jsonify(
                {
                    "rolls": rolls,
                    "total": total,
                    "other_rolls": other_rolls,
                    "other_total": other_total,
                }
            )

        return jsonify({"rolls": rolls_a, "total": total_a})
    except (ValueError, KeyError) as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/roll-digit", methods=["POST"])
def roll_digit():
    data = request.get_json()
    try:
        num_digits = int(data["num_digits"])
        sides = int(data["sides"])
        rolls, total = roll_digit_dice(num_digits, sides)
        return jsonify({"rolls": rolls, "total": total})
    except (ValueError, KeyError) as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/roll-d66", methods=["POST"])
def roll_d66():
    try:
        rolls, total = roll_digit_dice(2, 6)
        return jsonify({"rolls": rolls, "total": total})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/roll-d666", methods=["POST"])
def roll_d666():
    try:
        rolls, total = roll_digit_dice(3, 6)
        return jsonify({"rolls": rolls, "total": total})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/roll-osr-stats", methods=["POST"])
def roll_osr_stats():
    stats = []
    for _ in range(6):
        rolls, total = roll_dice(3, 6)
        stats.append({"rolls": rolls, "total": total})
    return jsonify({"stats": stats})


@app.route("/api/oracle-deck/draw", methods=["POST"])
def oracle_deck_draw():
    data = request.get_json() or {}
    try:
        count = max(1, int(data.get("count", 1)))
    except (ValueError, TypeError):
        return jsonify({"error": "count must be a number"}), 400
    with _oracle_deck_lock:
        state = _load_oracle_state()
        deck = state["cards"]
        deck_was_reset = False
        cards_drawn = []

        for _ in range(count):
            if not deck:
                deck = new_deck()
                deck_was_reset = True
            card, deck = draw_card(deck)
            cards_drawn.append(card)

        _save_oracle_state({"cards": deck})
    return jsonify({"cards": cards_drawn, "remaining": len(deck), "deck_was_reset": deck_was_reset})


@app.route("/api/deck/status", methods=["GET"])
def deck_status():
    with _deck_lock:
        state = _load_state()
    return jsonify({"remaining": len(state["cards"]), "include_jokers": state["include_jokers"]})


@app.route("/api/deck/draw", methods=["POST"])
def deck_draw():
    data = request.get_json() or {}
    try:
        count = max(1, int(data.get("count", 1)))
    except (ValueError, TypeError):
        return jsonify({"error": "count must be a number"}), 400
    with _deck_lock:
        state = _load_state()
        deck = state["cards"]
        include_jokers = state["include_jokers"]
        deck_was_reset = False
        cards_drawn = []

        for _ in range(count):
            if not deck:
                deck = new_deck(include_jokers=include_jokers)
                deck_was_reset = True
            card, deck = draw_card(deck)
            cards_drawn.append(card)

        _save_state({"cards": deck, "include_jokers": include_jokers})
    return jsonify({"cards": cards_drawn, "remaining": len(deck), "deck_was_reset": deck_was_reset})


@app.route("/api/deck/reset", methods=["POST"])
def deck_reset():
    data = request.get_json() or {}
    with _deck_lock:
        state = _load_state()
        include_jokers = bool(data.get("include_jokers", state["include_jokers"]))
        deck = new_deck(include_jokers=include_jokers)
        _save_state({"cards": deck, "include_jokers": include_jokers})
    return jsonify({"remaining": len(deck), "include_jokers": include_jokers})


if __name__ == "__main__":
    app.run(port=5000, debug=True)
