# Traveller

Random generator tools for solo [Traveller TTRPG](https://en.wikipedia.org/wiki/Traveller_(role-playing_game)) players. Written in Python.

## Features

- **Dice roller** — roll any combination of dice with optional modifier, drop-lowest, and advantage/disadvantage; repeat the same roll multiple times in one click
- **Wide die type support** — d3, d4, d5, d6, d7, d8, d10, d12, d14, d16, d20, d24, d30, d100
- **Digit dice** — d66 / d666 rolls that combine die results into a multi-digit number (e.g. for Traveller tables)
- **OSR stats** — roll 6 sets of 3d6 for character generation
- **Presets** — save and reload favourite roll configurations (persisted in browser localStorage)
- **Card deck** — draw from a standard 52-card deck (optionally with 2 jokers); deck state persists across draws and auto-resets when exhausted
- **Roll/draw history** — scrollable ticker-tape of every roll and card draw made this session
- Web UI (Next.js frontend + Flask API)
- Interactive CLI entry point

## Installation

```bash
pip install -e ".[test,lint]"
```

Requires Python 3.10+.

## Usage

### CLI

```bash
traveller-dice
```

You'll be prompted for the number of dice, sides per die, and an optional modifier:

```
Dice Roller
Number of dice: 3
Sides per die: 6
Modifier (optional, default 0): -1
Rolls: [4, 2, 5]
Total: 11 -1 = 10
```

You can also invoke the package directly:

```bash
python -m traveller
```

### Python API

```python
from traveller.dice import roll_dice, roll_digit_dice, roll_osr_stats
from traveller.cards import new_deck, draw_card

# Roll 2d6 with a +2 modifier
rolls, total = roll_dice(2, 6, modifier=2)

# Roll 3d6 and drop the lowest result
rolls, total = roll_dice(3, 6, drop_lowest=True)

# Roll digit dice — combine results into a number (e.g. 3, 5 → 35)
rolls, result = roll_digit_dice(2, 6)

# Roll 6 × 3d6 for OSR character stats
stats = roll_osr_stats()  # list of (rolls, total) tuples

# Draw cards from a shuffled deck
deck = new_deck()                        # 52 cards
deck = new_deck(include_jokers=True)     # 54 cards
card, deck = draw_card(deck)             # {"suit": "Hearts", "rank": "Ace"}, remaining deck
```

### Web App

The web UI consists of a Flask API backend and a Next.js frontend.

**Backend** (requires Python with `flask` and `flask-cors`):

```bash
cd web/api
pip install -r requirements.txt
python app.py          # runs on http://localhost:5000
```

**Frontend** (requires Node.js):

```bash
cd web/frontend
npm install
npm run dev            # runs on http://localhost:3000
```

Open http://localhost:3000 in your browser. The frontend proxies all `/api/*` requests to the Flask server at port 5000, so both processes must be running.

The web UI is organised into two tabs:

- **Dice** — standard roll controls (number of rolls, die type, modifier, drop-lowest, advantage) alongside special rolls (d66, d666) and user presets
- **Cards** — draw one or more cards from the persistent deck; optionally include 2 jokers; reset the deck at any time

All rolls and card draws are recorded in the **History** panel on the right.

## Development

```bash
# Run tests
python -m pytest

# Lint and format
python -m ruff check --fix . && python -m ruff format .

# Run against all supported Python versions
tox
```
