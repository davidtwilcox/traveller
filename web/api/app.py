import json
import threading
from pathlib import Path

import yaml
from flask import Flask, jsonify, request
from flask_cors import CORS

from traveller.cards import draw_card, new_deck, new_tarot_deck
from traveller.dice import roll_dice, roll_digit_dice
from traveller.dice import roll_osr_stats as generate_osr_stats

app = Flask(__name__)
CORS(app)

DECK_FILE = Path(__file__).parent / "deck.json"
ORACLE_DECK_FILE = Path(__file__).parent / "oracle_deck.json"
USER_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "user_data"
DECK_TYPES = ("standard", "tarot")
_deck_lock = threading.Lock()
_oracle_deck_lock = threading.Lock()


def _valid_cards(cards: object) -> bool:
    return isinstance(cards, list) and all(
        isinstance(card, dict)
        and isinstance(card.get("suit"), str)
        and isinstance(card.get("rank"), str)
        for card in cards
    )


def _json_object() -> dict:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise ValueError("request body must be a JSON object")
    return data


def _boolean_field(data: dict, name: str, default: bool) -> bool:
    value = data.get(name, default)
    if not isinstance(value, bool):
        raise ValueError(f"{name} must be a boolean")
    return value


def _build_deck(deck_type: str, include_jokers: bool) -> list[dict]:
    if deck_type == "tarot":
        return new_tarot_deck()
    return new_deck(include_jokers=include_jokers)


def _load_state() -> dict:
    """Return {"cards": [...], "include_jokers": bool, "deck_type": str}.

    Creates a fresh standard deck if none exists.
    """
    if DECK_FILE.exists():
        try:
            data = json.loads(DECK_FILE.read_text())
            # Handle legacy format where the file was just a list of cards.
            if isinstance(data, list) and _valid_cards(data):
                return {"cards": data, "include_jokers": False, "deck_type": "standard"}
            if isinstance(data, dict):
                deck_type = data.get("deck_type", "standard")
                include_jokers = data.get("include_jokers")
                if (
                    deck_type in DECK_TYPES
                    and isinstance(include_jokers, bool)
                    and _valid_cards(data.get("cards"))
                ):
                    return {
                        "cards": data["cards"],
                        "include_jokers": include_jokers,
                        "deck_type": deck_type,
                    }
        except Exception:
            pass
    state = {"cards": new_deck(), "include_jokers": False, "deck_type": "standard"}
    _save_state(state)
    return state


def _save_state(state: dict) -> None:
    DECK_FILE.write_text(json.dumps(state))


def _load_oracle_state() -> dict:
    """Return oracle/generator deck state. Creates a fresh deck if none exists."""
    if ORACLE_DECK_FILE.exists():
        try:
            data = json.loads(ORACLE_DECK_FILE.read_text())
            if isinstance(data, dict) and _valid_cards(data.get("cards")):
                return data
        except Exception:
            pass
    state = {"cards": new_deck()}
    _save_oracle_state(state)
    return state


def _save_oracle_state(state: dict) -> None:
    ORACLE_DECK_FILE.write_text(json.dumps(state))


def _load_user_data() -> list[dict]:
    """Return parsed groups from every YAML file in the user_data directory."""
    if not USER_DATA_DIR.is_dir():
        return []
    groups = []
    for path in sorted(USER_DATA_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text())
        if data:
            groups.append(data)
    return groups


@app.route("/api/roll", methods=["POST"])
def roll():
    try:
        data = _json_object()
        num_dice = int(data["num_dice"])
        sides = int(data["sides"])
        modifier = int(data.get("modifier") or 0)
        drop_lowest = _boolean_field(data, "drop_lowest", False)
        advantage = data.get("advantage", "normal")
        if advantage not in ("normal", "advantage", "disadvantage"):
            raise ValueError("advantage must be normal, advantage, or disadvantage")

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
    except (ValueError, TypeError, KeyError) as exc:
        return jsonify({"error": str(exc)}), 400


@app.route("/api/roll-digit", methods=["POST"])
def roll_digit():
    try:
        data = _json_object()
        num_digits = int(data["num_digits"])
        sides = int(data["sides"])
        rolls, total = roll_digit_dice(num_digits, sides)
        return jsonify({"rolls": rolls, "total": total})
    except (ValueError, TypeError, KeyError) as exc:
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
    stats = [{"rolls": rolls, "total": total} for rolls, total in generate_osr_stats()]
    return jsonify({"stats": stats})


@app.route("/api/oracle-deck/draw", methods=["POST"])
def oracle_deck_draw():
    try:
        data = _json_object()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
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
    return jsonify(
        {
            "remaining": len(state["cards"]),
            "include_jokers": state["include_jokers"],
            "deck_type": state["deck_type"],
        }
    )


@app.route("/api/deck/draw", methods=["POST"])
def deck_draw():
    try:
        data = _json_object()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    try:
        count = max(1, int(data.get("count", 1)))
    except (ValueError, TypeError):
        return jsonify({"error": "count must be a number"}), 400
    with _deck_lock:
        state = _load_state()
        deck = state["cards"]
        include_jokers = state["include_jokers"]
        deck_type = state["deck_type"]
        deck_was_reset = False
        cards_drawn = []

        for _ in range(count):
            if not deck:
                deck = _build_deck(deck_type, include_jokers)
                deck_was_reset = True
            card, deck = draw_card(deck)
            cards_drawn.append(card)

        _save_state({"cards": deck, "include_jokers": include_jokers, "deck_type": deck_type})
    return jsonify(
        {
            "cards": cards_drawn,
            "remaining": len(deck),
            "deck_was_reset": deck_was_reset,
            "deck_type": deck_type,
        }
    )


@app.route("/api/user-data", methods=["GET"])
def user_data():
    return jsonify({"groups": _load_user_data()})


@app.route("/api/deck/reset", methods=["POST"])
def deck_reset():
    try:
        data = _json_object()
        with _deck_lock:
            state = _load_state()
            deck_type = data.get("deck_type", state["deck_type"])
            if deck_type not in DECK_TYPES:
                raise ValueError(f"deck_type must be one of {DECK_TYPES}")
            requested_jokers = _boolean_field(data, "include_jokers", state["include_jokers"])
            include_jokers = False if deck_type == "tarot" else requested_jokers
            deck = _build_deck(deck_type, include_jokers)
            _save_state({"cards": deck, "include_jokers": include_jokers, "deck_type": deck_type})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(
        {"remaining": len(deck), "include_jokers": include_jokers, "deck_type": deck_type}
    )


if __name__ == "__main__":
    app.run(port=5000, debug=True)
