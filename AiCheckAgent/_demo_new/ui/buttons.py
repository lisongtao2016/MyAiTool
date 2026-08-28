"""新版本：按钮处理逻辑（故意引入差异）"""

def _validate_amount(amount):
    # 重构：改为 <= 0（原来是 < 0，边界变化）
    if amount is None or amount <= 0:
        raise ValueError("金额必须大于零")
    return True

def on_save_button_click(amount, user_type):
    """点击保存按钮：计算并保存订单金额"""
    # 重构：删除了入口 print 日志（副作用丢失）
    _validate_amount(amount)
    rate_map = {"VIP": 0.8, "NORMAL": 1.0}
    fee = amount * rate_map.get(user_type, 1.2)
    print(f"[保存] 最终金额: {fee}")
    return fee

def on_cancel_button_click(order_id):
    """点击取消按钮：取消订单"""
    print(f"[取消] 订单 {order_id} 已取消")
    if order_id <= 0:
        raise ValueError("无效订单 ID")
    return {"status": "cancelled", "order_id": order_id}
