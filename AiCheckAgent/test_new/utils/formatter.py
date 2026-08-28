"""
新版本 - 数据格式化工具（与旧版完全一致，用于验证等价判断）
"""

def format_amount(amount, currency="CNY"):
    """金额格式化，保留2位小数，附加货币符号"""
    if not isinstance(amount, (int, float)):
        raise TypeError(f"金额必须是数字类型，当前类型: {type(amount).__name__}")
    symbols = {"CNY": "¥", "USD": "$", "EUR": "€"}
    symbol = symbols.get(currency, currency)
    return f"{symbol}{amount:.2f}"


def generate_order_no(user_id, timestamp):
    """生成订单号：ORD-{user_id}-{timestamp后8位}"""
    ts_str = str(int(timestamp))[-8:]
    return f"ORD-{user_id}-{ts_str}"


def status_to_text(status_code):
    """订单状态码转中文文本（新版扩展了状态码，旧版只有3种）"""
    mapping = {
        0: "待支付",
        1: "已支付",
        2: "已取消",
        3: "已发货",         # ← 差异10: 新版新增状态
        4: "已完成",         # ← 差异11: 新版新增状态
    }
    if status_code not in mapping:
        return "未知状态"
    return mapping[status_code]
