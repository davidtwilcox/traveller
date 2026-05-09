import json
import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from traveller.dice import roll_dice, roll_digit_dice

app = Flask(__name__)
CORS(app)

PRESETS_FILE = os.path.join(os.path.dirname(__file__), "presets.dat")


def load_presets():
    if not os.path.exists(PRESETS_FILE):
        return []
    try:
        with open(PRESETS_FILE) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def save_presets(presets):
    with open(PRESETS_FILE, "w") as f:
        json.dump(presets, f)


@app.route("/api/presets", methods=["GET"])
def get_presets():
    return jsonify({"presets": load_presets()})


@app.route("/api/presets", methods=["POST"])
def add_preset():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    settings = data.get("settings")
    if not name or not settings:
        return jsonify({"error": "name and settings required"}), 400
    if len(name) > 15:
        return jsonify({"error": "name must be 15 characters or less"}), 400
    presets = load_presets()
    if any(p["name"] == name for p in presets):
        return jsonify({"error": "a preset with that name already exists"}), 400
    presets.append({"name": name, "settings": settings})
    save_presets(presets)
    return jsonify({"ok": True})


@app.route("/api/presets/<name>", methods=["DELETE"])
def delete_preset(name):
    presets = load_presets()
    new_presets = [p for p in presets if p["name"] != name]
    if len(new_presets) == len(presets):
        return jsonify({"error": "preset not found"}), 404
    save_presets(new_presets)
    return jsonify({"ok": True})


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
            return jsonify({"rolls": rolls, "total": total, "other_rolls": other_rolls, "other_total": other_total})

        return jsonify({"rolls": rolls_a, "total": total_a})
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


if __name__ == "__main__":
    app.run(port=5000, debug=True)
