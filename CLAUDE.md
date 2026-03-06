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

The package lives under `src/traveller/` (src layout). The entry point `traveller-dice` maps to `traveller.cli:main`.

- `dice.py` — core logic. `roll_dice(num_dice, sides, modifier)` returns `(rolls, total)`. `roll_osr_stats()` is a thin wrapper for 3d6.
- `cli.py` — interactive CLI that calls `roll_dice` and prints results.
- `__main__.py` — allows `python -m traveller` invocation.

New game mechanics should be added as functions in `dice.py` (or new modules under `src/traveller/`) and exposed through `cli.py` as needed.

## Linting

Ruff is configured with rules `E`, `F`, `I`, `B`, `UP` and line length 100. Pre-commit hooks run `ruff` (with `--fix`) and `ruff-format` automatically on commit.
