# Traveller

Random generator tools for solo [Traveller TTRPG](https://en.wikipedia.org/wiki/Traveller_(role-playing_game)) players. Written in Python.

## Features

- **Dice roller** — roll any combination of dice (`NdS+modifier`), with optional drop-lowest and advantage/disadvantage
- **Digit dice** — d66 / d666 rolls that combine die results into a multi-digit number (e.g. for tables)
- **OSR stats** — roll 6 sets of 3d6 for character generation
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
from traveller.dice import roll_dice, roll_digit_dice

# Roll 2d6 with a +2 modifier
rolls, total = roll_dice(2, 6, modifier=2)

# Roll 3d6 and drop the lowest result
rolls, total = roll_dice(3, 6, drop_lowest=True)

# Roll digit dice — combine results into a number (e.g. 3, 5 → 35)
rolls, result = roll_digit_dice(2, 6)
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

## Development

```bash
# Run tests
python -m pytest

# Lint and format
python -m ruff check --fix . && python -m ruff format .

# Run against all supported Python versions
tox
```
