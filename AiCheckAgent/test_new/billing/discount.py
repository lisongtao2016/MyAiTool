"""
新版本 - 折扣与积分计算模块
重构说明：满减逻辑修改、积分上限调整、移除会员折扣（改由 order_panel 统一处理）
"""

def calculate_full_reduction(amount, threshold=200, reduction=30):
    """
    满减计算（新版）
    差异：旧版 amount < 0 报错，新版 amount <= 0 报错（语义收紧）
    差异：旧版不满足门槛返回原价，新版相同
    差异：reduction 上限新增校验（旧版无此校验）
    """
    if amount <= 0:                         # ← 差异6: 旧版 < 0，新版 <= 0
        raise ValueError("金额必须大于0")
    if threshold <= 0:
        raise ValueError("满减门槛必须大于0")
    if reduction >= threshold:              # ← 差异7: 新版新增此校验，旧版无
        raise ValueError("减免金额不能大于等于门槛金额")

    times = int(amount // threshold)
    return max(0.0, amount - times * reduction)


def calculate_points_discount(amount, points):
    """
    积分抵扣（新版）
    差异：最多抵扣比例从20%提升到30%
    """
    if points < 0:
        raise ValueError("积分不能为负数")

    max_deduction = amount * 0.3            # ← 差异8: 旧版 0.2，新版 0.3
    actual_deduction = min(points / 100, max_deduction)
    return round(amount - actual_deduction, 2)


# ← 差异9: 新版删除了 apply_member_discount 函数（旧版有此函数）
# 会员折扣已并入 on_submit_order_click 统一处理
