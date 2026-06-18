import pytest

from traveller.cards import JOKERS, RANKS, SUITS, draw_card, new_deck


def test_new_deck_has_52_cards():
    assert len(new_deck()) == 52


def test_new_deck_contains_all_combinations():
    deck = new_deck()
    for suit in SUITS:
        for rank in RANKS:
            assert {"suit": suit, "rank": rank} in deck


def test_new_deck_no_duplicates():
    deck = new_deck()
    pairs = [(c["suit"], c["rank"]) for c in deck]
    assert len(pairs) == len(set(pairs))


def test_draw_card_returns_a_valid_card():
    deck = new_deck()
    card, remaining = draw_card(deck)
    assert card["suit"] in SUITS
    assert card["rank"] in RANKS


def test_draw_card_removes_card_from_remaining():
    deck = new_deck()
    card, remaining = draw_card(deck)
    assert len(remaining) == 51
    assert card not in remaining


def test_draw_all_52_cards_are_unique():
    deck = new_deck()
    drawn = []
    while deck:
        card, deck = draw_card(deck)
        drawn.append((card["suit"], card["rank"]))
    assert len(drawn) == 52
    assert len(set(drawn)) == 52


def test_draw_card_empty_deck_raises():
    with pytest.raises(ValueError, match="empty"):
        draw_card([])


def test_new_deck_with_jokers_has_54_cards():
    assert len(new_deck(include_jokers=True)) == 54


def test_new_deck_with_jokers_contains_both_jokers():
    deck = new_deck(include_jokers=True)
    for joker in JOKERS:
        assert joker in deck


def test_new_deck_without_jokers_excludes_jokers():
    deck = new_deck()
    assert all(c["suit"] != "Joker" for c in deck)


def test_draw_card_from_joker_deck_returns_valid_card():
    all_suits = set(SUITS) | {"Joker"}
    all_ranks = set(RANKS) | {"Red Joker", "Black Joker"}
    deck = new_deck(include_jokers=True)
    card, remaining = draw_card(deck)
    assert card["suit"] in all_suits
    assert card["rank"] in all_ranks


def test_draw_all_54_cards_from_joker_deck_are_unique():
    deck = new_deck(include_jokers=True)
    drawn = []
    while deck:
        card, deck = draw_card(deck)
        drawn.append((card["suit"], card["rank"]))
    assert len(drawn) == 54
    assert len(set(drawn)) == 54


def test_new_deck_jokers_are_independent_copies():
    deck = new_deck(include_jokers=True)
    jokers = [c for c in deck if c["suit"] == "Joker"]
    jokers[0]["rank"] = "MUTATED"
    fresh = new_deck(include_jokers=True)
    fresh_jokers = [c for c in fresh if c["suit"] == "Joker"]
    assert all(j["rank"] != "MUTATED" for j in fresh_jokers)
