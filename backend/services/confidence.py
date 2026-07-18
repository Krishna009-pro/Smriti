import math

def wilson_lower_bound(positive: int, total: int, z: float = 1.96) -> float:
    """
    Lower bound of the Wilson score confidence interval (z=1.96 -> 95% confidence).
    Why this instead of positive/total: a fix confirmed 1/1 time and one confirmed
    18/20 times should NOT score the same. This is sample-size-aware and conservative
    by construction -- it only trusts a high score once there's enough evidence to earn it.
    """
    if total == 0:
        return 0.0
    z2 = z * z
    phat = positive / total
    denominator = 1 + z2 / total
    centre_adjustment = z2 / (2 * total)
    adjusted_stddev = math.sqrt((phat * (1 - phat) + z2 / (4 * total)) / total)
    lower_bound = (phat + centre_adjustment - z * adjusted_stddev) / denominator
    return max(0.0, round(lower_bound, 4))
