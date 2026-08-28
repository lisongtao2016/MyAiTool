"""
code_checker_agent.py
=====================
基于 Claude (Google Cloud Vertex AI) 的代码逻辑等价性检查 Agent。

检查目标：新旧 Python 代码在业务逻辑与功能上是否完全等价。
忽略：语法糖、格式缩进、变量重命名。
重点：边界条件、分支缺失、副作用（print/日志）差异。

核心 Pipeline（单函数）:
  Step 1  LLM 生成测试用例   → Claude 分析分支覆盖，输出参数列表
  Step 2  黑盒沙箱执行       → exec 运行新旧代码，捕获返回值/异常/stdout
  Step 3  LLM 白盒逻辑诊断   → Claude 综合黑盒差异给出结构化报告

文件夹对比 Pipeline:
  Phase A  扫描机能列表       → Claude 读取文件大纲，提取所有用户可见机能
  Phase B  机能对齐           → Claude 匹配新旧机能，报告缺失/新增
  Phase C  按文件分组         → 列出每个机能涉及的文件
  Phase D  逐机能代码对比     → 对每个机能的入口函数运行 Step1-3

依赖安装:
  pip install "anthropic[vertex]" pydantic

鉴权（本地开发）:
  gcloud auth application-default login

运行方式:
  python code_checker_agent.py                            # 内置演示
  python code_checker_agent.py demo                       # 同上
  python code_checker_agent.py files old.py new.py        # 比对两个文件
  python code_checker_agent.py folders old_dir new_dir    # 比对两个文件夹（按机能）
  python code_checker_agent.py git                        # git 暂存区检查
"""

# ===========================================================================
# 标准库
# ===========================================================================
import sys
import io
import json
import os
import ast
import argparse
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

# ===========================================================================
# 第三方库
# ===========================================================================
from pydantic import BaseModel, Field
from anthropic import AnthropicVertex

# ---------------------------------------------------------------------------
# Windows 控制台 UTF-8 兼容（避免 GBK 编码报错）
# ---------------------------------------------------------------------------
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


# ===========================================================================
# Section 1 — 结构化数据模型（Pydantic）
# ===========================================================================

class TestCase(BaseModel):
    """单个黑盒测试用例"""
    kwargs: Dict[str, Any] = Field(description="调用函数所需的参数字典")
    reason: str = Field(description="设计该用例的目的")


class TestCaseList(BaseModel):
    """Claude 返回的测试用例集合"""
    cases: List[TestCase]


class LogicReport(BaseModel):
    """单个函数/机能的等价性诊断报告"""
    is_equivalent: bool = Field(description="新旧代码逻辑是否完全等价")
    differences: List[str] = Field(description="列出所有逻辑差异、副作用差异或边界条件差异")
    summary: str = Field(description="本次对比的综合总结说明")


# ---------- 文件夹比较专用模型 ----------

class FeatureItem(BaseModel):
    """代码库中一个可见的用户机能（如：点击保存按钮、用户登录、计算折扣）"""
    name: str = Field(description="机能名称，简洁描述用户动作或系统功能")
    description: str = Field(description="机能的详细说明")
    entry_file: str = Field(description="实现该机能的主要文件（相对路径）")
    entry_functions: List[str] = Field(description="实现该机能的入口函数名列表")


class FolderFeatureReport(BaseModel):
    """一个文件夹中所有机能的汇总"""
    features: List[FeatureItem]


class FeatureAlignmentItem(BaseModel):
    """一对新旧机能的对应关系"""
    old_feature: str = Field(description="旧代码中的机能名称")
    new_feature: str = Field(description="新代码中对应的机能名称（名称可能不同但语义相同）")
    confidence: str = Field(description="对齐置信度: high / medium / low")


class FolderAlignReport(BaseModel):
    """新旧文件夹机能的全量对齐结果"""
    aligned_pairs: List[FeatureAlignmentItem] = Field(description="新旧机能对应关系列表")
    missing_in_new: List[str] = Field(description="旧代码有但新代码缺失的机能")
    added_in_new: List[str] = Field(description="新代码新增的机能（旧代码没有）")
    summary: str = Field(description="整体对齐情况总结")


class FeatureCheckResult(BaseModel):
    """单个机能的完整检查结果"""
    feature_name: str
    old_entry_file: str
    new_entry_file: str
    entry_functions: List[str]
    report: LogicReport


# ===========================================================================
# Section 2 — AST 文件解析器
# ===========================================================================

class FileParser:
    """
    利用 Python 内置 ast 模块解析 .py 文件：
    - extract_functions    提取所有函数源码
    - extract_imports      提取顶层 import（供沙箱注入）
    - normalize_ast        AST 精简（去注释/空行，减少 Token）
    - extract_outline      生成文件大纲（函数签名列表，供机能发现使用）
    - collect_called_funcs 追踪函数调用链（同文件内）
    """

    @staticmethod
    def extract_functions(file_path: str) -> Dict[str, str]:
        """提取文件所有顶层函数/方法源码，返回 {func_name: source}。"""
        with open(file_path, "r", encoding="utf-8") as f:
            source = f.read()
        tree = ast.parse(source)
        src_lines = source.splitlines()
        functions: Dict[str, str] = {}
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_src = "\n".join(src_lines[node.lineno - 1: node.end_lineno])
                functions[node.name] = func_src
        return functions

    @staticmethod
    def extract_functions_from_source(source: str) -> Dict[str, str]:
        """从源码字符串提取所有函数，返回 {func_name: source}。"""
        tree = ast.parse(source)
        src_lines = source.splitlines()
        functions: Dict[str, str] = {}
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                func_src = "\n".join(src_lines[node.lineno - 1: node.end_lineno])
                functions[node.name] = func_src
        return functions

    @staticmethod
    def extract_imports(file_path: str) -> str:
        """提取文件顶层 import 语句，返回可直接 exec 的字符串。"""
        with open(file_path, "r", encoding="utf-8") as f:
            source = f.read()
        tree = ast.parse(source)
        src_lines = source.splitlines()
        import_lines: List[str] = []
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                import_lines.extend(src_lines[node.lineno - 1: node.end_lineno])
        return "\n".join(import_lines)

    @staticmethod
    def extract_imports_from_source(source: str) -> str:
        """从源码字符串提取顶层 import。"""
        tree = ast.parse(source)
        src_lines = source.splitlines()
        import_lines: List[str] = []
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                import_lines.extend(src_lines[node.lineno - 1: node.end_lineno])
        return "\n".join(import_lines)

    @staticmethod
    def normalize_ast(code: str) -> str:
        """AST 规范化：去除注释/多余空行，减少 Claude Token 消耗。"""
        try:
            return ast.unparse(ast.parse(code))
        except SyntaxError:
            return code

    @staticmethod
    def extract_outline(source: str) -> List[str]:
        """
        提取文件大纲（函数签名列表），供机能发现阶段使用。
        格式：["def func_name(param1, param2)", "async def handler(event)", ...]
        """
        try:
            tree = ast.parse(source)
        except SyntaxError:
            return []
        signatures: List[str] = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                args = [a.arg for a in node.args.args]
                prefix = "async def" if isinstance(node, ast.AsyncFunctionDef) else "def"
                signatures.append(f"{prefix} {node.name}({', '.join(args)})")
        return signatures

    @staticmethod
    def collect_called_funcs(source: str, entry_func_names: List[str]) -> List[str]:
        """
        追踪 entry_func_names 在同文件内调用的其他函数名（一层调用链）。
        用于提取完整的机能代码块。
        """
        try:
            tree = ast.parse(source)
        except SyntaxError:
            return []

        # 收集文件内所有定义的函数名
        defined = {
            node.name
            for node in ast.walk(tree)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
        }

        # 对每个 entry function，收集它调用的函数名
        called: set = set()
        for node in ast.walk(tree):
            if (
                isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
                and node.name in entry_func_names
            ):
                for child in ast.walk(node):
                    if isinstance(child, ast.Call):
                        if isinstance(child.func, ast.Name):
                            called.add(child.func.id)
                        elif isinstance(child.func, ast.Attribute):
                            called.add(child.func.attr)

        # 只返回在同文件内有定义的被调用函数（排除 entry 自身）
        return sorted(called & defined - set(entry_func_names))


# ===========================================================================
# Section 3 — 安全沙箱执行器（带超时 + 危险操作拦截）
# ===========================================================================

SANDBOX_TIMEOUT_SEC = 2

_DANGEROUS_PATTERNS: List[str] = [
    "os.remove", "os.unlink", "os.rmdir", "shutil.rmtree",
    "subprocess", "__import__", "open(", "socket",
]


def _check_dangerous(code: str) -> Optional[str]:
    for pattern in _DANGEROUS_PATTERNS:
        if pattern in code:
            return f"[安全拦截] 代码含危险操作 '{pattern}'，已拒绝执行"
    return None


def _exec_func(code_str: str, func_name: str, kwargs: dict, container: dict) -> None:
    buf = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = buf
    try:
        namespace: dict = {}
        exec(code_str, namespace)  # noqa: S102
        if func_name not in namespace:
            raise AttributeError(f"函数 '{func_name}' 在代码中未找到")
        container["result"] = namespace[func_name](**kwargs)
        container["error"] = None
    except Exception as exc:
        container["result"] = None
        container["error"] = f"{type(exc).__name__}: {exc}"
    finally:
        sys.stdout = old_stdout
        container["stdout"] = buf.getvalue().strip()


def execute_code_safely(
    code_str: str,
    func_name: str,
    kwargs: dict,
    timeout: int = SANDBOX_TIMEOUT_SEC,
) -> dict:
    """安全执行代码中的目标函数，带超时与危险操作拦截。"""
    danger_msg = _check_dangerous(code_str)
    if danger_msg:
        return {"result": None, "error": danger_msg, "stdout": ""}

    container: dict = {}
    with ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_exec_func, code_str, func_name, kwargs, container)
        try:
            future.result(timeout=timeout)
        except FuturesTimeoutError:
            return {
                "result": None,
                "error": f"TimeoutError: 执行超时（>{timeout}s），可能含死循环",
                "stdout": "",
            }
        except Exception as exc:
            return {"result": None, "error": f"{type(exc).__name__}: {exc}", "stdout": ""}

    return {
        "result": container.get("result"),
        "error": container.get("error"),
        "stdout": container.get("stdout", ""),
    }


# ===========================================================================
# Section 4 — Git 集成工具
# ===========================================================================

class GitHelper:
    @staticmethod
    def get_changed_py_files() -> List[str]:
        output = subprocess.check_output(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=M"],
            stderr=subprocess.DEVNULL,
        ).decode("utf-8")
        return [f for f in output.strip().splitlines() if f.endswith(".py")]

    @staticmethod
    def get_file_content(git_ref: str, file_path: str) -> Optional[str]:
        ref = f"{git_ref}:{file_path}" if git_ref else f":{file_path}"
        try:
            return subprocess.check_output(
                ["git", "show", ref], stderr=subprocess.DEVNULL
            ).decode("utf-8")
        except subprocess.CalledProcessError:
            return None

    @staticmethod
    def write_temp(content: str, suffix: str = ".py") -> str:
        fd, path = tempfile.mkstemp(suffix=suffix)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
        return path


# ===========================================================================
# Section 5 — 可选增强：Z3 形式化验证
# ===========================================================================
try:
    import z3  # type: ignore

    def z3_verify(old_code: str, new_code: str, func_name: str) -> Optional[str]:
        import inspect
        try:
            old_ns: dict = {}
            new_ns: dict = {}
            exec(old_code, old_ns)  # noqa: S102
            exec(new_code, new_ns)  # noqa: S102
            old_fn = old_ns.get(func_name)
            new_fn = new_ns.get(func_name)
            if not (old_fn and new_fn):
                return None
            params = list(inspect.signature(old_fn).parameters.keys())
            z3_vars = {p: z3.Real(p) for p in params}
            old_expr = old_fn(**z3_vars)
            new_expr = new_fn(**z3_vars)
        except Exception:
            return None
        solver = z3.Solver()
        solver.add(old_expr != new_expr)
        if solver.check() == z3.sat:
            model = solver.model()
            counterexample = {p: str(model[z3_vars[p]]) for p in params}
            return f"Z3 发现不等价反例: {counterexample}"
        return None

    HAS_Z3 = True

except ImportError:
    HAS_Z3 = False

    def z3_verify(old_code: str, new_code: str, func_name: str) -> Optional[str]:  # type: ignore[misc]
        return None


# ===========================================================================
# Section 6 — FolderScanner（文件夹扫描工具）
# ===========================================================================

# 跳过的目录名
_SKIP_DIRS = {
    "__pycache__", ".git", ".venv", "venv", "env",
    "node_modules", ".mypy_cache", ".pytest_cache", "dist", "build",
}

# 单文件发送给 Claude 的最大字符数（超过则截断）
_MAX_FILE_CHARS = 6000


class FolderScanner:
    """扫描文件夹，构建文件内容字典和文件大纲，用于机能发现阶段。"""

    @staticmethod
    def scan(folder_path: str) -> Dict[str, str]:
        """
        递归扫描文件夹，返回 {相对路径: 文件内容}。
        跳过 __pycache__ 等无关目录，跳过非 .py 文件。
        """
        result: Dict[str, str] = {}
        base = Path(folder_path).resolve()

        for path in sorted(base.rglob("*.py")):
            # 跳过黑名单目录
            if any(part in _SKIP_DIRS for part in path.parts):
                continue
            rel = str(path.relative_to(base)).replace("\\", "/")
            try:
                content = path.read_text(encoding="utf-8")
                result[rel] = content
            except Exception:
                pass  # 无法读取的文件跳过

        return result

    @staticmethod
    def build_outline(files_content: Dict[str, str]) -> str:
        """
        构建文件夹大纲（紧凑文本），格式：
          📄 path/to/file.py
            - def func_name(args)
            - async def handler(event)
        用于发送给 Claude 做机能发现，不附带完整代码以节省 Token。
        """
        lines: List[str] = []
        for rel_path, source in files_content.items():
            signatures = FileParser.extract_outline(source)
            if not signatures:
                continue
            lines.append(f"📄 {rel_path}")
            for sig in signatures:
                lines.append(f"    - {sig}")
        return "\n".join(lines)

    @staticmethod
    def get_file_source(
        files_content: Dict[str, str],
        rel_path: str,
        max_chars: int = _MAX_FILE_CHARS,
    ) -> str:
        """获取指定文件的源码（超长时截断并提示）。"""
        source = files_content.get(rel_path, "")
        if len(source) > max_chars:
            source = source[:max_chars] + f"\n# ... [截断，原文件共 {len(source)} 字符]"
        return source


# ===========================================================================
# Section 7 — CodeEquivalenceAgent（核心 Agent 类）
# ===========================================================================

class CodeEquivalenceAgent:
    """
    代码等价性检查 Agent，支持四种模式：
      check()            → 检查单个函数
      check_files()      → 比对两个 .py 文件（逐函数）
      check_folders()    → 比对两个文件夹（先发现机能，再逐机能检查）
      check_git_staged() → 检查 git 暂存区变更
    """

    def __init__(
        self,
        project_id: str = "lixil-kinzokusapfront-dev",
        region: str = "us-east5",
        model: str = "claude-sonnet-4-6",
    ) -> None:
        self.client = AnthropicVertex(region=region, project_id=project_id)
        self.model = model

    # ------------------------------------------------------------------
    # 内部工具
    # ------------------------------------------------------------------
    def _call_claude(self, prompt: str, max_tokens: int = 4096) -> str:
        """调用 Claude，temperature=0 保证确定性输出。"""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=0,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text

    @staticmethod
    def _parse_json(raw: str) -> dict:
        """
        从 Claude 返回文本中提取 JSON，三层容错策略：
        1. 去除 markdown 代码块后直接解析
        2. 截取首个 { ... } 范围再解析
        3. 截取首个 [ ... ] 数组再解析（cases 包装）
        """
        cleaned = raw.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start: end + 1])
            except json.JSONDecodeError:
                pass

        start, end = cleaned.find("["), cleaned.rfind("]")
        if start != -1 and end > start:
            try:
                return {"cases": json.loads(cleaned[start: end + 1])}
            except json.JSONDecodeError:
                pass

        raise ValueError(
            f"无法解析 Claude 返回的 JSON。\n原始响应前 400 字符:\n{raw[:400]}"
        )

    # ------------------------------------------------------------------
    # 单函数 Pipeline — Step 1: 生成测试用例
    # ------------------------------------------------------------------
    def generate_test_cases(self, old_code: str, new_code: str) -> List[dict]:
        old_ast = FileParser.normalize_ast(old_code)
        new_ast = FileParser.normalize_ast(new_code)
        json_schema = json.dumps(TestCaseList.model_json_schema(), ensure_ascii=False)

        prompt = f"""
你是一个精准的代码测试专家。请分析以下新旧两段代码（已 AST 规范化），
生成能覆盖所有逻辑分支（含边界极限值、空值、数据类型碰撞）的测试参数列表。

【旧代码（AST）】:
```python
{old_ast}
```
【新代码（AST）】:
```python
{new_ast}
```

输出要求：严格按照 JSON Schema 格式，不附带任何 Markdown 或多余说明。
覆盖：正常值、边界值、负数、零、None、空字符串、错误类型等。

JSON Schema:
{json_schema}
"""
        for attempt in range(3):
            try:
                raw = self._call_claude(prompt)
                data = self._parse_json(raw)
                return data.get("cases", [])
            except (ValueError, json.JSONDecodeError) as e:
                if attempt < 2:
                    print(f"  [重试 {attempt+2}/3] JSON 解析失败，重新请求...")
                else:
                    print(f"  [警告] 测试用例生成失败，跳过黑盒测试: {e}")
                    return []
        return []

    # ------------------------------------------------------------------
    # 单函数 Pipeline — Step 2: 沙箱黑盒执行
    # ------------------------------------------------------------------
    def run_blackbox_tests(
        self,
        old_code: str,
        new_code: str,
        func_name: str,
        test_cases: List[dict],
        extra_imports: str = "",
    ) -> List[dict]:
        full_old = f"{extra_imports}\n{old_code}" if extra_imports else old_code
        full_new = f"{extra_imports}\n{new_code}" if extra_imports else new_code

        diffs: List[dict] = []
        for case in test_cases:
            kwargs = case.get("kwargs", {})
            old_res = execute_code_safely(full_old, func_name, kwargs)
            new_res = execute_code_safely(full_new, func_name, kwargs)

            if (
                old_res["result"] != new_res["result"]
                or old_res["error"] != new_res["error"]
                or old_res["stdout"] != new_res["stdout"]
            ):
                diffs.append({
                    "input_kwargs": kwargs,
                    "reason": case.get("reason"),
                    "old_behavior": old_res,
                    "new_behavior": new_res,
                })
        return diffs

    # ------------------------------------------------------------------
    # 单函数 Pipeline — Step 3: Claude 白盒诊断
    # ------------------------------------------------------------------
    def analyze_logic(
        self, old_code: str, new_code: str, blackbox_diffs: List[dict]
    ) -> LogicReport:
        json_schema = json.dumps(LogicReport.model_json_schema(), ensure_ascii=False)

        prompt = f"""
你是一个严谨的代码审查 Agent。请对比以下新旧代码，
忽略语法糖/变量命名/排版，专注于业务逻辑与副作用是否一致。

【旧代码】:
```python
{old_code}
```
【新代码】:
```python
{new_code}
```
【黑盒测试发现的实际运行差异】:
{json.dumps(blackbox_diffs, ensure_ascii=False, indent=2)}

重点检查：
1. 边界条件（> vs >=、is None vs not x 等）
2. 逻辑分支漏掉或执行顺序改变
3. 副作用差异（print、文件写入、全局变量修改等）

输出要求：严格按照 JSON Schema 格式，不附带任何多余文字：
{json_schema}
"""
        raw = self._call_claude(prompt)
        data = self._parse_json(raw)
        return LogicReport(**data)

    # ------------------------------------------------------------------
    # 对外接口 1：检查单个函数
    # ------------------------------------------------------------------
    def check(
        self,
        old_code: str,
        new_code: str,
        func_name: str,
        extra_imports: str = "",
    ) -> LogicReport:
        print(f"  [Step 1/3] Claude 生成测试用例...")
        cases = self.generate_test_cases(old_code, new_code)
        print(f"             已生成 {len(cases)} 组测试用例")

        print(f"  [Step 2/3] 沙箱黑盒执行（超时={SANDBOX_TIMEOUT_SEC}s/用例）...")
        diffs = self.run_blackbox_tests(old_code, new_code, func_name, cases, extra_imports)
        print(f"             发现 {len(diffs)} 处行为差异")

        if HAS_Z3:
            z3_result = z3_verify(old_code, new_code, func_name)
            if z3_result:
                print(f"  [Z3] {z3_result}")

        print(f"  [Step 3/3] Claude 白盒逻辑诊断...")
        return self.analyze_logic(old_code, new_code, diffs)

    # ------------------------------------------------------------------
    # 对外接口 2：比对两个 .py 文件（逐函数）
    # ------------------------------------------------------------------
    def check_files(self, old_path: str, new_path: str) -> None:
        print(f"\n文件对比: {old_path}  vs  {new_path}")

        old_funcs = FileParser.extract_functions(old_path)
        new_funcs = FileParser.extract_functions(new_path)
        old_imports = FileParser.extract_imports(old_path)

        common = sorted(set(old_funcs) & set(new_funcs))
        only_old = sorted(set(old_funcs) - set(new_funcs))
        only_new = sorted(set(new_funcs) - set(old_funcs))

        if only_old:
            print(f"[警告] 旧文件独有函数（疑似删除）: {', '.join(only_old)}")
        if only_new:
            print(f"[提示] 新文件新增函数: {', '.join(only_new)}")
        if not common:
            print("无共同函数可对比，退出。")
            return

        for func_name in common:
            print(f"\n{'=' * 56}\n  函数: {func_name}")
            report = self.check(
                old_funcs[func_name], new_funcs[func_name],
                func_name, extra_imports=old_imports,
            )
            _print_report(report)

    # ==================================================================
    # 对外接口 3：比对两个文件夹（四阶段 Pipeline）
    # ==================================================================

    # ------ Phase A：从文件夹大纲中发现机能列表 ------
    def _discover_features(
        self, label: str, outline: str
    ) -> FolderFeatureReport:
        """
        让 Claude 阅读文件夹大纲（函数签名列表），
        识别出所有用户可见的机能（如：点击保存按钮、用户登录、计算折扣）。
        返回结构化的 FolderFeatureReport。
        """
        json_schema = json.dumps(FolderFeatureReport.model_json_schema(), ensure_ascii=False)

        prompt = f"""
你是一个资深代码架构师。请阅读以下【{label}】的文件结构大纲（仅含函数签名），
识别出所有用户可见的「机能」（功能点）。

机能的定义：
- 一个用户可以触发/感知的独立操作，例如：
  「点击保存按钮」「用户登录」「计算订单折扣」「导出 Excel 报表」
- 一个机能通常由一个或多个函数协作实现
- 不要把每个函数都列为一个机能，要从用户视角归纳

【文件结构大纲】:
{outline}

输出要求：
- entry_file 填写该机能最主要的入口文件（相对路径，与大纲中格式一致）
- entry_functions 填写触发该机能时最先被调用的函数名列表
- 严格按照 JSON Schema 格式输出，不附带任何多余文字

JSON Schema:
{json_schema}
"""
        for attempt in range(3):
            try:
                raw = self._call_claude(prompt, max_tokens=8192)
                data = self._parse_json(raw)
                return FolderFeatureReport(**data)
            except (ValueError, json.JSONDecodeError) as e:
                if attempt < 2:
                    print(f"  [重试 {attempt+2}/3] 机能发现 JSON 解析失败，重新请求...")
                else:
                    raise RuntimeError(f"机能发现失败: {e}") from e
        raise RuntimeError("机能发现失败")

    # ------ Phase B：对齐新旧机能列表 ------
    def _align_features(
        self,
        old_report: FolderFeatureReport,
        new_report: FolderFeatureReport,
    ) -> FolderAlignReport:
        """
        让 Claude 对比新旧机能列表，找出：
        - 相互对应的机能对（即使名称不同但语义相同）
        - 旧代码有但新代码缺失的机能
        - 新代码新增的机能
        """
        old_list = "\n".join(
            f"  - [{f.name}] {f.description} (入口: {f.entry_file})"
            for f in old_report.features
        )
        new_list = "\n".join(
            f"  - [{f.name}] {f.description} (入口: {f.entry_file})"
            for f in new_report.features
        )
        json_schema = json.dumps(FolderAlignReport.model_json_schema(), ensure_ascii=False)

        prompt = f"""
你是一个代码迁移专家。请对比新旧两个代码库的机能列表，判断它们的对应关系。

【旧代码机能列表】:
{old_list}

【新代码机能列表】:
{new_list}

任务：
1. 找出语义等价的机能对（名称可能不同，但功能相同）
2. 找出旧代码有但新代码缺失的机能（可能被删除）
3. 找出新代码新增的机能（旧代码没有）

输出要求：严格按照 JSON Schema 格式，不附带任何多余文字：
{json_schema}
"""
        for attempt in range(3):
            try:
                raw = self._call_claude(prompt, max_tokens=8192)
                data = self._parse_json(raw)
                return FolderAlignReport(**data)
            except (ValueError, json.JSONDecodeError) as e:
                if attempt < 2:
                    print(f"  [重试 {attempt+2}/3] 机能对齐 JSON 解析失败，重新请求...")
                else:
                    raise RuntimeError(f"机能对齐失败: {e}") from e
        raise RuntimeError("机能对齐失败")

    # ------ Phase C+D：收集机能代码并对比 ------
    def _collect_feature_code(
        self,
        feature: FeatureItem,
        files_content: Dict[str, str],
    ) -> Tuple[str, str, str]:
        """
        收集某个机能的完整代码块：
        1. 读取 entry_file 的源码
        2. 提取 entry_functions 的源码
        3. 追踪并附加这些函数在同文件内调用的辅助函数（一层）
        返回 (imports, combined_code, primary_entry_function)
        """
        source = files_content.get(feature.entry_file, "")
        if not source:
            # 尝试模糊匹配（文件名可能包含目录前缀差异）
            for path, content in files_content.items():
                if path.endswith(feature.entry_file.split("/")[-1]):
                    source = content
                    break

        if not source:
            return "", f"# 未找到文件: {feature.entry_file}", feature.entry_functions[0] if feature.entry_functions else "unknown"

        imports = FileParser.extract_imports_from_source(source)
        all_funcs = FileParser.extract_functions_from_source(source)

        # 收集入口函数 + 被调用的辅助函数
        helper_names = FileParser.collect_called_funcs(source, feature.entry_functions)
        target_funcs = set(feature.entry_functions) | set(helper_names)

        code_blocks: List[str] = []
        # 先放辅助函数（依赖先于调用方）
        for name in helper_names:
            if name in all_funcs:
                code_blocks.append(all_funcs[name])
        # 再放入口函数
        for name in feature.entry_functions:
            if name in all_funcs:
                code_blocks.append(all_funcs[name])

        combined = "\n\n".join(code_blocks) if code_blocks else f"# 未找到函数: {feature.entry_functions}"
        primary = feature.entry_functions[0] if feature.entry_functions else "unknown"
        return imports, combined, primary

    def check_folders(self, old_folder: str, new_folder: str) -> None:
        """
        文件夹四阶段比对 Pipeline:
          Phase A: 扫描两个文件夹，Claude 发现各自的机能列表
          Phase B: Claude 对齐机能，报告缺失/新增
          Phase C: 按文件列出每个机能的代码位置
          Phase D: 逐机能提取入口代码，运行三步等价性检查
        """
        print(f"\n{'═' * 60}")
        print(f"  文件夹对比")
        print(f"  旧: {old_folder}")
        print(f"  新: {new_folder}")
        print(f"{'═' * 60}")

        # ── Phase A: 扫描文件夹 ──────────────────────────────────────
        print("\n[Phase A] 扫描文件夹，发现机能列表...")

        old_files = FolderScanner.scan(old_folder)
        new_files = FolderScanner.scan(new_folder)

        if not old_files:
            print(f"  [错误] 旧文件夹中未找到 .py 文件: {old_folder}")
            return
        if not new_files:
            print(f"  [错误] 新文件夹中未找到 .py 文件: {new_folder}")
            return

        print(f"  旧文件夹: {len(old_files)} 个 .py 文件")
        for f in sorted(old_files.keys()):
            print(f"    📄 {f}")

        print(f"  新文件夹: {len(new_files)} 个 .py 文件")
        for f in sorted(new_files.keys()):
            print(f"    📄 {f}")

        old_outline = FolderScanner.build_outline(old_files)
        new_outline = FolderScanner.build_outline(new_files)

        print("\n  Claude 正在分析旧代码机能...")
        old_feature_report = self._discover_features("旧代码", old_outline)
        print(f"  → 发现 {len(old_feature_report.features)} 个机能:")
        for f in old_feature_report.features:
            print(f"    · [{f.name}] {f.description}")

        print("\n  Claude 正在分析新代码机能...")
        new_feature_report = self._discover_features("新代码", new_outline)
        print(f"  → 发现 {len(new_feature_report.features)} 个机能:")
        for f in new_feature_report.features:
            print(f"    · [{f.name}] {f.description}")

        # ── Phase B: 机能对齐 ────────────────────────────────────────
        print("\n[Phase B] 对齐新旧机能列表...")
        align = self._align_features(old_feature_report, new_feature_report)

        print(f"\n  对齐结果总结: {align.summary}")

        if align.missing_in_new:
            print(f"\n  ⚠️  旧代码有但新代码【缺失】的机能（{len(align.missing_in_new)} 个）:")
            for m in align.missing_in_new:
                print(f"    ✗  {m}")

        if align.added_in_new:
            print(f"\n  ➕ 新代码【新增】的机能（{len(align.added_in_new)} 个）:")
            for a in align.added_in_new:
                print(f"    +  {a}")

        if not align.aligned_pairs:
            print("\n  没有找到可对比的机能对，流程结束。")
            return

        print(f"\n  ✅ 可对比的机能对（{len(align.aligned_pairs)} 对）:")
        for pair in align.aligned_pairs:
            print(f"    [{pair.old_feature}] ↔ [{pair.new_feature}]  (置信度: {pair.confidence})")

        # ── Phase C+D: 按机能逐一对比 ───────────────────────────────
        print(f"\n[Phase C+D] 按机能逐一提取代码并比对...")

        # 建立机能名→FeatureItem 的查找字典
        old_feat_map = {f.name: f for f in old_feature_report.features}
        new_feat_map = {f.name: f for f in new_feature_report.features}

        results: List[FeatureCheckResult] = []

        for idx, pair in enumerate(align.aligned_pairs, 1):
            old_feat = old_feat_map.get(pair.old_feature)
            new_feat = new_feat_map.get(pair.new_feature)

            if not old_feat or not new_feat:
                print(f"\n  [跳过] 机能 '{pair.old_feature}' ↔ '{pair.new_feature}' 无法找到对应定义")
                continue

            print(f"\n{'─' * 56}")
            print(f"  机能 {idx}/{len(align.aligned_pairs)}: 【{pair.old_feature}】↔【{pair.new_feature}】")
            print(f"  旧代码入口: {old_feat.entry_file}  {old_feat.entry_functions}")
            print(f"  新代码入口: {new_feat.entry_file}  {new_feat.entry_functions}")

            # Phase C: 提取机能代码
            old_imports, old_code, old_primary = self._collect_feature_code(old_feat, old_files)
            _, new_code, new_primary = self._collect_feature_code(new_feat, new_files)

            if "未找到" in old_code or "未找到" in new_code:
                print(f"  [跳过] 无法提取代码: {old_code[:80]}")
                continue

            # 统一使用旧代码的函数名作为沙箱入口（名称可能变了）
            entry_func = old_primary

            # Phase D: 运行三步等价性检查
            report = self.check(old_code, new_code, entry_func, extra_imports=old_imports)

            result = FeatureCheckResult(
                feature_name=pair.old_feature,
                old_entry_file=old_feat.entry_file,
                new_entry_file=new_feat.entry_file,
                entry_functions=old_feat.entry_functions,
                report=report,
            )
            results.append(result)
            _print_report(report)

        # ── 汇总报告 ────────────────────────────────────────────────
        _print_folder_summary(align, results)

    # ------------------------------------------------------------------
    # 对外接口 4：Git 暂存区检查
    # ------------------------------------------------------------------
    def check_git_staged(self) -> bool:
        changed_files = GitHelper.get_changed_py_files()
        if not changed_files:
            print("暂存区没有 .py 文件变更，跳过检查。")
            return True

        all_equivalent = True

        for rel_path in changed_files:
            head_src = GitHelper.get_file_content("HEAD", rel_path)
            staged_src = GitHelper.get_file_content("", rel_path)

            if not head_src:
                print(f"[跳过] {rel_path}（新文件，无旧版本可对比）")
                continue
            if not staged_src:
                print(f"[跳过] {rel_path}（无法读取暂存区内容）")
                continue

            old_tmp = GitHelper.write_temp(head_src)
            new_tmp = GitHelper.write_temp(staged_src)
            try:
                old_funcs = FileParser.extract_functions(old_tmp)
                new_funcs = FileParser.extract_functions(new_tmp)
                old_imports = FileParser.extract_imports(old_tmp)
                common = sorted(set(old_funcs) & set(new_funcs))

                print(f"\n{'=' * 56}\n  Git 变更文件: {rel_path}")

                for func_name in common:
                    print(f"\n  函数: {func_name}")
                    report = self.check(
                        old_funcs[func_name], new_funcs[func_name],
                        func_name, extra_imports=old_imports,
                    )
                    _print_report(report)
                    if not report.is_equivalent:
                        all_equivalent = False
            finally:
                os.unlink(old_tmp)
                os.unlink(new_tmp)

        return all_equivalent


# ===========================================================================
# Section 8 — 输出格式化
# ===========================================================================

def _print_report(report: LogicReport) -> None:
    """将单个 LogicReport 以可读格式打印。"""
    status = "✅ 等价" if report.is_equivalent else "❌ 不等价"
    print(f"\n  逻辑是否完全等价: {status}")
    if report.differences:
        print("  差异列表:")
        for item in report.differences:
            print(f"    - {item}")
    print(f"  总结: {report.summary}")


def _print_folder_summary(
    align: FolderAlignReport,
    results: List[FeatureCheckResult],
) -> None:
    """打印文件夹比对的汇总报告。"""
    print(f"\n{'═' * 60}")
    print("  文件夹对比汇总报告")
    print(f"{'═' * 60}")

    # 机能完整性
    if align.missing_in_new:
        print(f"\n  ⚠️  缺失机能 ({len(align.missing_in_new)} 个):")
        for m in align.missing_in_new:
            print(f"      ✗ {m}")
    else:
        print("\n  ✅ 机能完整性: 无缺失")

    # 逐机能等价性
    print(f"\n  逐机能等价性结果:")
    equiv_count = sum(1 for r in results if r.report.is_equivalent)
    for r in results:
        icon = "✅" if r.report.is_equivalent else "❌"
        print(f"    {icon} 【{r.feature_name}】")
        print(f"       入口: {r.old_entry_file} → {r.new_entry_file}")

    print(f"\n  总计: {equiv_count}/{len(results)} 个机能逻辑等价")

    if equiv_count == len(results) and not align.missing_in_new:
        print("\n  🎉 结论: 新旧代码库机能完整且逻辑等价！")
    else:
        print("\n  ⚠️  结论: 存在机能缺失或逻辑差异，需人工确认。")

    print(f"{'═' * 60}")


# ===========================================================================
# Section 9 — CLI 入口与内置演示
# ===========================================================================

def _run_demo(agent: CodeEquivalenceAgent) -> None:
    old_code = """
def calculate_fee(amount, is_admin):
    print(f"Processing amount: {amount}")
    if amount > 100:
        if is_admin:
            return amount * 0.05
        return amount * 0.1
    return 0.0
"""
    new_code = """
def calculate_fee(amount, is_admin):
    if amount >= 100:
        rate = 0.05 if is_admin else 0.1
        return amount * rate
    return 0.0
"""
    print("\n===== 内置演示：calculate_fee =====")
    report = agent.check(old_code, new_code, "calculate_fee")
    print("\n" + "=" * 56)
    _print_report(report)
    print("=" * 56)


def _build_cli() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="代码逻辑等价性检查 Agent（Claude on Vertex AI）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
子命令说明:
  demo                   内置演示
  files  OLD NEW         比对两个 .py 文件（逐函数）
  folders OLD_DIR NEW_DIR  比对两个文件夹（先发现机能，再逐机能对比）
  git                    检查 git 暂存区 .py 变更
        """,
    )
    sub = parser.add_subparsers(dest="mode")
    sub.add_parser("demo", help="运行内置演示")

    fp = sub.add_parser("files", help="比对两个 .py 文件")
    fp.add_argument("old_file", help="旧版本 .py 文件路径")
    fp.add_argument("new_file", help="新版本 .py 文件路径")

    dp = sub.add_parser("folders", help="比对两个文件夹（按机能）")
    dp.add_argument("old_dir", help="旧版本文件夹路径")
    dp.add_argument("new_dir", help="新版本文件夹路径")

    sub.add_parser("git", help="检查 git 暂存区 .py 变更")
    return parser


# ===========================================================================
# Section 10 — 运行入口
# ===========================================================================
if __name__ == "__main__":
    # ★ 配置区
    GCP_PROJECT_ID = "lixil-kinzokusapfront-dev"
    GCP_REGION     = "us-east5"
    CLAUDE_MODEL   = "claude-sonnet-4-6"

    cli_args = _build_cli().parse_args()

    agent = CodeEquivalenceAgent(
        project_id=GCP_PROJECT_ID,
        region=GCP_REGION,
        model=CLAUDE_MODEL,
    )

    if cli_args.mode == "files":
        agent.check_files(cli_args.old_file, cli_args.new_file)

    elif cli_args.mode == "folders":
        agent.check_folders(cli_args.old_dir, cli_args.new_dir)

    elif cli_args.mode == "git":
        ok = agent.check_git_staged()
        if not ok:
            print("\n[CI] 发现逻辑差异，建议阻断提交！")
            sys.exit(1)
        print("\n[CI] 所有函数逻辑等价，检查通过。✅")

    else:
        _run_demo(agent)
