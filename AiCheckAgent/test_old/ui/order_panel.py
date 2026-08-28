"""
旧版本 - 订单管理面板按钮处理
包含：提交订单按钮、退款按钮、查询按钮
"""

def _validate_order(amount, item_count):
    """内部校验：金额和数量合法性"""
    if amount <= 0:
        raise ValueError(f"订单金额必须大于0，当前值: {amount}")
    if item_count <= 0:
        raise ValueError(f"商品数量必须大于0，当前值: {item_count}")
    return True


def on_submit_order_click(amount, item_count, user_level):
    """
    点击【提交订单】按钮
    校验 → 计算折扣 → 打印确认日志 → 返回最终金额
    """
    print(f"[提交] 开始处理订单: 金额={amount}, 数量={item_count}, 用户等级={user_level}")
    _validate_order(amount, item_count)

    # 折扣规则：VIP打8折，SVIP打6折，普通用户无折扣
    if user_level == "SVIP":
        discount = 0.6
    elif user_level == "VIP":
        discount = 0.8
    else:
        discount = 1.0

    final_amount = amount * discount
    print(f"[提交] 订单处理完成，折后金额: {final_amount}")
    return {"status": "submitted", "amount": final_amount, "count": item_count}


def on_refund_click(order_id, reason):
    """
    点击【退款】按钮
    校验订单ID → 检查退款原因 → 返回退款结果
    """
    print(f"[退款] 申请退款: 订单={order_id}, 原因={reason}")
    if not order_id or order_id <= 0:
        raise ValueError("无效的订单ID")
    if not reason or len(reason.strip()) < 5:
        raise ValueError("退款原因不能少于5个字符")

    return {"status": "refund_approved", "order_id": order_id, "reason": reason}


def on_query_order_click(order_id):
    """
    点击【查询订单】按钮
    返回订单状态（旧版：只支持正整数ID）
    """
    print(f"[查询] 查询订单: {order_id}")
    if not isinstance(order_id, int) or order_id <= 0:
        raise TypeError("订单ID必须为正整数")
    return {"order_id": order_id, "status": "found"}
