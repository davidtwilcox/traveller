import random
from typing import List, Tuple


def roll_dice(
    num_dice: int, sides: int, modifier: int = 0, drop_lowest: bool = False
) -> Tuple[List[int], int]:
    if num_dice <= 0:
        raise ValueError("num_dice must be greater than 0")
    if sides <= 1:
        raise ValueError("sides must be greater than 1")

    rolls = [random.randint(1, sides) for _ in range(num_dice)]
    counted = rolls[:]
    if drop_lowest and num_dice > 1:
        counted = sorted(rolls)[1:]
    total = sum(counted) + modifier
    return rolls, total


def roll_digit_dice(num_digits: int, sides: int) -> Tuple[List[int], int]:
    if num_digits < 2:
        raise ValueError("num_digits must be at least 2")
    if sides < 2:
        raise ValueError("sides must be at least 2")
    if sides > 9:
        raise ValueError("sides must be at most 9")

    rolls = [random.randint(1, sides) for _ in range(num_digits)]
    result = int("".join(str(r) for r in rolls))
    return rolls, result
