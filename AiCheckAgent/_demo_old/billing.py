"""旧版本：计费逻辑"""

def calculate_discount(amount, coupon_code):
    """根据优惠码计算折扣"""
    if not coupon_code:
        return amount
    if coupon_code == "HALF":
        return amount * 0.5
    if coupon_code.startswith("D"):
        return amount * 0.9
    return amount

def apply_tax(amount, region):
    """按地区加税"""
    tax_rate = {"CN": 0.13, "US": 0.08, "EU": 0.20}.get(region, 0.0)
    return amount * (1 + tax_rate)
