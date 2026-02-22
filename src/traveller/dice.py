import random
from typing import List, Tuple


def roll_dice(num_dice: int, sides: int, modifier: int = 0) -> Tuple[List[int], int]:
    if num_dice <= 0:
        raise ValueError("num_dice must be greater than 0")
    if sides <= 1:
        raise ValueError("sides must be greater than 1")

    rolls = [random.randint(1, sides) for _ in range(num_dice)]
    total = sum(rolls) + modifier
    return rolls, total
