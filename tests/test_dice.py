import pytest

from traveller.dice import roll_dice, roll_digit_dice


def test_roll_dice_returns_rolls_and_total():
    rolls, total = roll_dice(3, 6)
    assert len(rolls) == 3
    assert all(1 <= r <= 6 for r in rolls)
    assert total == sum(rolls)


def test_roll_dice_applies_modifier():
    rolls, total = roll_dice(2, 4, modifier=3)
    assert total == sum(rolls) + 3


@pytest.mark.parametrize("num_dice,sides", [(0, 6), (-1, 6), (2, 1), (2, 0)])
def test_roll_dice_rejects_invalid_inputs(num_dice, sides):
    with pytest.raises(ValueError):
        roll_dice(num_dice, sides)


def test_drop_lowest_excludes_min_from_total():
    rolls, total = roll_dice(3, 6, drop_lowest=True)
    assert len(rolls) == 3
    assert total == sum(sorted(rolls)[1:])


def test_drop_lowest_with_modifier():
    rolls, total = roll_dice(3, 6, modifier=2, drop_lowest=True)
    assert total == sum(sorted(rolls)[1:]) + 2


def test_drop_lowest_ignored_for_single_die():
    rolls, total = roll_dice(1, 6, drop_lowest=True)
    assert total == rolls[0]


def test_roll_digit_dice_combines_digits():
    rolls, result = roll_digit_dice(2, 6)
    assert len(rolls) == 2
    assert all(1 <= r <= 6 for r in rolls)
    assert result == rolls[0] * 10 + rolls[1]


def test_roll_digit_dice_three_digits():
    rolls, result = roll_digit_dice(3, 8)
    assert len(rolls) == 3
    assert all(1 <= r <= 8 for r in rolls)
    assert result == rolls[0] * 100 + rolls[1] * 10 + rolls[2]


@pytest.mark.parametrize("num_digits,sides", [(1, 6), (0, 6), (2, 1), (2, 10), (2, 0)])
def test_roll_digit_dice_rejects_invalid_inputs(num_digits, sides):
    with pytest.raises(ValueError):
        roll_digit_dice(num_digits, sides)

