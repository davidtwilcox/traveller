# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Random generator tools for the [Traveller TTRPG](https://en.wikipedia.org/wiki/Traveller_(role-playing_game)), aimed at solo players. Python package named `traveller`, installed in editable mode via `src/` layout.

## Commands

```bash
# Install in editable mode with test/lint deps
pip install -e ".[test,lint]"

# Run all tests
python -m pytest

# Run a single test file
python -m pytest tests/test_dice.py

# Run a single test by name
python -m pytest tests/test_dice.py::test_roll_dice_returns_rolls_and_total

# Lint
python -m ruff check .

# Format check
python -m ruff format --check .

# Auto-fix lint + format
python -m ruff check --fix . && python -m ruff format .

# Run across all supported Python versions (requires tox)
tox

# Run the CLI entry point
traveller-dice
```

## Architecture

### Python package (`src/traveller/`)

The entry point `traveller-dice` maps to `traveller.cli:main`.

- `dice.py` — core dice logic.
  - `roll_dice(num_dice, sides, modifier, drop_lowest)` — returns `(rolls, total)`.
  - `roll_digit_dice(num_digits, sides)` — combines rolls into a multi-digit number (e.g. `[3,5]` → `35`). Sides must be 2–9.
  - `roll_osr_stats()` — rolls 6 × 3d6 for character generation.
- `cards.py` — core card logic.
  - `new_deck(include_jokers=False)` — returns a freshly shuffled 52- or 54-card deck.
  - `draw_card(deck)` — returns `(card, remaining_deck)`; raises `ValueError` on empty deck.
  - Cards are dicts: `{"suit": "Hearts", "rank": "Ace"}`. Jokers use `suit="Joker"`.
- `cli.py` — interactive CLI that calls `roll_dice` and prints results.
- `__main__.py` — allows `python -m traveller` invocation.

New game mechanics should be added as functions in `dice.py` or new modules under `src/traveller/`, and exposed through `cli.py` as needed.

### Web app (`web/`)

- `web/api/app.py` — Flask REST API. Dice routes:
  - `POST /api/roll` — standard roll; accepts `num_dice`, `sides`, `modifier`, `drop_lowest`, `advantage` (`"normal"` / `"advantage"` / `"disadvantage"`).
  - `POST /api/roll-d66` — 2-digit dice.
  - `POST /api/roll-d666` — 3-digit dice.
  - `POST /api/roll-osr-stats` — returns 6 stat arrays.
  - Cards tab deck routes (state persisted to `web/api/deck.json`, gitignored):
  - `GET /api/deck/status` — returns `{remaining, include_jokers}`.
  - `POST /api/deck/draw` — accepts `{count}`; returns `{cards, remaining, deck_was_reset}`. Auto-resets and reshuffles when the deck is exhausted.
  - `POST /api/deck/reset` — accepts `{include_jokers}`; reshuffles a fresh deck and returns `{remaining, include_jokers}`.
  - Oracle/Generator deck route (separate 52-card deck, no jokers, persisted to `web/api/oracle_deck.json`, gitignored):
  - `POST /api/oracle-deck/draw` — accepts `{count}`; returns `{cards, remaining, deck_was_reset}`. Auto-resets without jokers.
- `web/frontend/` — Next.js 15 / React 19 / TypeScript / Tailwind CSS frontend.
  - `src/app/page.tsx` — single-page UI with a tabbed left panel and a History panel on the right.
    - **Dice tab**: two columns — Standard controls (number of rolls, number of dice, die type, modifier, drop-lowest, advantage, Roll button) and Special/Presets (d66, d666, OSR Stats, user presets). Default number of dice is 3; drop-lowest is auto-cleared when number of dice is reduced to 1.
    - **Cards tab**: number of cards input, include-jokers checkbox, Draw and Reset Deck buttons. Remaining count shown in header.
    - **Oracle tab**: Yes/No group (Likely/Even/Unlikely odds toggle + Answer button rolling 2d6); How group (Answer button rolling 1d6); Focus group (Action, Detail, Topic, Random Event buttons — each draws from the oracle deck and interprets the card rank, appending the suit domain); GM Moves group (Pacing button rolling 1d6, with a 6 triggering a Random Event draw; Failure button rolling 1d6).
    - **Generator tab**: Plot hook group (Generate — rolls Objective, Adversaries, Rewards); NPC group (Generate — draws Identity and Goal from oracle deck with domain, rolls Notable feature with optional Detail draw, rolls Attitude to PCs, draws Conversation from oracle deck with domain); Dungeon crawler group (Theme — draws Appearance and Use from oracle deck with domain; Area — rolls Location, Encounter, Object, Total exits); Hex crawler group (Current hex — rolls Terrain and Contents with possible sub-roll; Random event — 1d6, on 5–6 draws Action + Topic cards from oracle deck).
  - Die types available: d3, d4, d5, d6, d7, d8, d10, d12, d14, d16, d20, d24, d30, d60, d100, d1000.
  - Presets (persisted to `localStorage` key `traveller-presets`) store all roll settings: number of rolls, number of dice, die type, modifier, drop-lowest, and advantage. Applying a preset uses the preset's own number of rolls, not the current UI value.
  - The Oracle and Generator tabs share a separate 52-card deck (no jokers) distinct from the Cards tab deck.
  - The frontend proxies `/api/*` to the Flask server at port 5000 (configured in `next.config.mjs`).

## Linting

Ruff is configured with rules `E`, `F`, `I`, `B`, `UP` and line length 100. Pre-commit hooks run `ruff` (with `--fix`) and `ruff-format` automatically on commit.
