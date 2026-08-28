def greet(name):
    # 重构：空字符串也视为 stranger
    if name is None or name == "":
        return "Hello, stranger!"
    return f"Hello, {name}!"

def add(a, b):
    # 重构：加了类型转换
    return int(a) + int(b)
