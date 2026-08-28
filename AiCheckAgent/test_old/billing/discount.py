"""
旧版本 - 折扣与积分计算模块
包含：满减计算、积分兑换、会员折扣
"""

def calculate_full_reduction(amount, threshold=200, reduction=30):
    """
    满减计算（旧版）
    规则：满 threshold 元减 reduction 元，可叠加
    """
    if amount < 0:
        raise ValueError("金额不能为负数")
    if threshold <= 0:
        raise ValueError("满减门槛必须大于0")

    times = int(amount // threshold)
    return max(0.0, amount - times * reduction)


def calculate_points_discount(amount, points):
    """
    积分抵扣（旧版）
    规则：每100积分抵扣1元，最多抵扣订单金额的20%
    """
    if points < 0:
        raise ValueError("积分不能为负数")

    max_deduction = amount * 0.2
    actual_deduction = min(points / 100, max_deduction)
    return round(amount - actual_deduction, 2)


def apply_member_discount(amount, member_type):
    """
    会员折扣（旧版）
    GOLD: 9折, PLATINUM: 85折, DIAMOND: 8折
    """
    rate_map = {
        "GOLD": 0.9,
        "PLATINUM": 0.85,
        "DIAMOND": 0.8,
    }
    rate = rate_map.get(member_type, 1.0)
    return round(amount * rate, 2)
