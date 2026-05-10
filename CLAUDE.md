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

- `dice.py` — core logic.
  - `roll_dice(num_dice, sides, modifier, drop_lowest)` — returns `(rolls, total)`.
  - `roll_digit_dice(num_digits, sides)` — combines rolls into a multi-digit number (e.g. `[3,5]` → `35`). Sides must be 2–9.
  - `roll_osr_stats()` — rolls 6 × 3d6 for character generation.
- `cli.py` — interactive CLI that calls `roll_dice` and prints results.
- `__main__.py` — allows `python -m traveller` invocation.

New game mechanics should be added as functions in `dice.py` (or new modules under `src/traveller/`) and exposed through `cli.py` as needed.

### Web app (`web/`)

- `web/api/app.py` — Flask REST API. Routes:
  - `POST /api/roll` — standard roll; accepts `num_dice`, `sides`, `modifier`, `drop_lowest`, `advantage` (`"normal"` / `"advantage"` / `"disadvantage"`).
  - `POST /api/roll-d66` — 2-digit dice.
  - `POST /api/roll-d666` — 3-digit dice.
  - `POST /api/roll-osr-stats` — returns 6 stat arrays.
- `web/frontend/` — Next.js 15 / React 19 / TypeScript / Tailwind CSS frontend.
  - `src/app/page.tsx` — single-page UI with three panels: roll controls (left), presets & special rolls (middle), scrollable roll history / ticker tape (right).
  - Die types available: d3, d4, d5, d6, d7, d8, d10, d12, d14, d16, d20, d24, d30, d100.
  - Presets are persisted to `localStorage` under the key `traveller-presets` (max 15 presets).
  - The frontend proxies `/api/*` to the Flask server at port 5000 (configured in `next.config.mjs`).

## Linting

Ruff is configured with rules `E`, `F`, `I`, `B`, `UP` and line length 100. Pre-commit hooks run `ruff` (with `--fix`) and `ruff-format` automatically on commit.
