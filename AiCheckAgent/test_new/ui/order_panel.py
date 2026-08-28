"""
新版本 - 订单管理面板按钮处理
重构说明：优化折扣逻辑，支持字符串订单ID
"""

def _validate_order(amount, item_count):
    """内部校验（新版：金额改为 >= 0 允许零元订单）"""
    if amount < 0:                          # ← 差异1: 旧版 <= 0，新版 < 0（允许零元）
        raise ValueError(f"订单金额不能为负数，当前值: {amount}")
    if item_count <= 0:
        raise ValueError(f"商品数量必须大于0，当前值: {item_count}")
    return True


def on_submit_order_click(amount, item_count, user_level):
    """
    点击【提交订单】按钮（新版：删除了入口日志，SVIP折扣从6折改为65折）
    """
    # ← 差异2: 删除了 print("[提交] 开始处理订单: ...") 入口日志
    _validate_order(amount, item_count)

    discount_map = {
        "SVIP": 0.65,   # ← 差异3: 旧版 0.6，新版 0.65
        "VIP": 0.8,
    }
    discount = discount_map.get(user_level, 1.0)

    final_amount = amount * discount
    print(f"[提交] 订单处理完成，折后金额: {final_amount}")
    return {"status": "submitted", "amount": final_amount, "count": item_count}


def on_refund_click(order_id, reason):
    """
    点击【退款】按钮（逻辑与旧版完全一致）
    """
    print(f"[退款] 申请退款: 订单={order_id}, 原因={reason}")
    if not order_id or order_id <= 0:
        raise ValueError("无效的订单ID")
    if not reason or len(reason.strip()) < 5:
        raise ValueError("退款原因不能少于5个字符")

    return {"status": "refund_approved", "order_id": order_id, "reason": reason}


def on_query_order_click(order_id):
    """
    点击【查询订单】按钮（新版：同时支持int和str类型的ID）
    """
    # ← 差异4: 旧版只支持 int，新版支持 int 和 str
    print(f"[查询] 查询订单: {order_id}")
    if isinstance(order_id, str):
        if not order_id.isdigit():
            raise ValueError("字符串订单ID必须为纯数字")
        order_id = int(order_id)
    elif not isinstance(order_id, int) or order_id <= 0:
        raise TypeError("订单ID必须为正整数或纯数字字符串")
    return {"order_id": order_id, "status": "found"}


# ← 差异5: 新增【批量取消】按钮（旧版没有此功能）
def on_batch_cancel_click(order_ids):
    """
    点击【批量取消】按钮（新版新增功能）
    """
    print(f"[批量取消] 取消订单列表: {order_ids}")
    if not order_ids:
        raise ValueError("订单列表不能为空")
    results = []
    for oid in order_ids:
        if oid > 0:
            results.append({"order_id": oid, "status": "cancelled"})
    return results
