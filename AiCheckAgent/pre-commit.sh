#!/usr/bin/env bash
# ============================================================
# pre-commit hook: 用 code_checker_agent 检查逻辑等价性
#
# 安装方式（在仓库根目录执行）:
#   cp AiCheckAgent/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
# ============================================================

set -euo pipefail

AGENT_SCRIPT="$(git rev-parse --show-toplevel)/AiCheckAgent/code_checker_agent.py"

if [ ! -f "$AGENT_SCRIPT" ]; then
    echo "[pre-commit] 未找到 code_checker_agent.py，跳过检查。"
    exit 0
fi

# 检查是否有 .py 文件变更
CHANGED=$(git diff --cached --name-only --diff-filter=M | grep '\.py$' || true)
if [ -z "$CHANGED" ]; then
    echo "[pre-commit] 暂存区无 .py 变更，跳过检查。"
    exit 0
fi

echo "[pre-commit] 启动代码逻辑等价性检查..."
PYTHONUTF8=1 python "$AGENT_SCRIPT" git
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "=========================================="
    echo "[pre-commit] 发现逻辑差异！提交已被阻断。"
    echo "  · 如确认变更符合预期，可用 git commit --no-verify 跳过"
    echo "=========================================="
    exit 1
fi

echo "[pre-commit] 逻辑等价性检查通过。"
exit 0
