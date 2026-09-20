import random

SUITS = ("Hearts", "Diamonds", "Spades", "Clubs")
RANKS = ("2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace")
JOKERS = ({"suit": "Joker", "rank": "Red Joker"}, {"suit": "Joker", "rank": "Black Joker"})

MAJOR_ARCANA = (
    "The Fool",
    "The Magician",
    "The High Priestess",
    "The Empress",
    "The Emperor",
    "The Hierophant",
    "The Lovers",
    "The Chariot",
    "Strength",
    "The Hermit",
    "Wheel of Fortune",
    "Justice",
    "The Hanged Man",
    "Death",
    "Temperance",
    "The Devil",
    "The Tower",
    "The Star",
    "The Moon",
    "The Sun",
    "Judgement",
    "The World",
)
TAROT_SUITS = ("Wands", "Cups", "Swords", "Pentacles")
TAROT_MINOR_RANKS = (
    "Ace",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "Page",
    "Knight",
    "Queen",
    "King",
)


def new_deck(include_jokers: bool = False) -> list[dict]:
    """Return a freshly shuffled deck (52 cards, or 54 when include_jokers is True)."""
    deck = [{"suit": suit, "rank": rank} for suit in SUITS for rank in RANKS]
    if include_jokers:
        deck.extend(dict(j) for j in JOKERS)
    random.shuffle(deck)
    return deck


def new_tarot_deck() -> list[dict]:
    """Return a freshly shuffled 78-card tarot deck (22 major arcana, 56 minor arcana)."""
    deck = [{"suit": "Major Arcana", "rank": rank} for rank in MAJOR_ARCANA]
    deck.extend({"suit": suit, "rank": rank} for suit in TAROT_SUITS for rank in TAROT_MINOR_RANKS)
    random.shuffle(deck)
    return deck


def draw_card(deck: list[dict]) -> tuple[dict, list[dict]]:
    """Draw a card from deck (mutates in place). Raises ValueError if empty."""
    if not deck:
        raise ValueError("Deck is empty")
    return deck.pop(), deck
