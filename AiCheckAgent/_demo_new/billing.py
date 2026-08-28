"""新版本：计费逻辑"""

def calculate_discount(amount, coupon_code):
    """根据优惠码计算折扣"""
    if not coupon_code:
        return amount
    discounts = {"HALF": 0.5}
    # 重构：原来 D 开头的优惠码给 0.9，现在改为 0.85（差异）
    if coupon_code in discounts:
        return amount * discounts[coupon_code]
    if coupon_code.startswith("D"):
        return amount * 0.85
    return amount

def apply_tax(amount, region):
    """按地区加税"""
    tax_rate = {"CN": 0.13, "US": 0.08, "EU": 0.20}.get(region, 0.0)
    return amount * (1 + tax_rate)
