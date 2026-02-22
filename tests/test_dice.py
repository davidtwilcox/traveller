import pytest

from traveller.dice import roll_dice


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
