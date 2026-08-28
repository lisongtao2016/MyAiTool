"""旧版本：按钮处理逻辑"""

def _validate_amount(amount):
    if amount is None or amount < 0:
        raise ValueError("金额不能为负数")
    return True

def on_save_button_click(amount, user_type):
    """点击保存按钮：计算并保存订单金额"""
    print(f"[保存] 开始处理金额: {amount}, 用户类型: {user_type}")
    _validate_amount(amount)
    if user_type == "VIP":
        fee = amount * 0.8
    elif user_type == "NORMAL":
        fee = amount * 1.0
    else:
        fee = amount * 1.2
    print(f"[保存] 最终金额: {fee}")
    return fee

def on_cancel_button_click(order_id):
    """点击取消按钮：取消订单"""
    print(f"[取消] 订单 {order_id} 已取消")
    if order_id <= 0:
        raise ValueError("无效订单 ID")
    return {"status": "cancelled", "order_id": order_id}
