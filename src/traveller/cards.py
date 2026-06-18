import random

SUITS = ("Hearts", "Diamonds", "Spades", "Clubs")
RANKS = ("2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King", "Ace")
JOKERS = ({"suit": "Joker", "rank": "Red Joker"}, {"suit": "Joker", "rank": "Black Joker"})


def new_deck(include_jokers: bool = False) -> list[dict]:
    """Return a freshly shuffled deck (52 cards, or 54 when include_jokers is True)."""
    deck = [{"suit": suit, "rank": rank} for suit in SUITS for rank in RANKS]
    if include_jokers:
        deck.extend(dict(j) for j in JOKERS)
    random.shuffle(deck)
    return deck


def draw_card(deck: list[dict]) -> tuple[dict, list[dict]]:
    """Draw a card from deck (mutates in place). Raises ValueError if empty."""
    if not deck:
        raise ValueError("Deck is empty")
    return deck.pop(), deck
