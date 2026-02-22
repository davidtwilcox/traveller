from __future__ import annotations

from .dice import roll_dice


def main() -> None:
    print("Dice Roller")
    try:
        num_dice = int(input("Number of dice: ").strip())
        sides = int(input("Sides per die: ").strip())
        modifier_raw = input("Modifier (optional, default 0): ").strip()
        modifier = int(modifier_raw) if modifier_raw else 0
    except ValueError as exc:
        raise SystemExit(f"Invalid input: {exc}") from exc

    rolls, total = roll_dice(num_dice, sides, modifier)
    mod_text = f"{modifier:+d}" if modifier else "0"
    print(f"Rolls: {rolls}")
    print(f"Total: {sum(rolls)} {mod_text} = {total}")
