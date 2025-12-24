"""
DeepResearch V2.0 - 数据极客 Agent (CodeWizard)

职责：
1. 数据清洗 - 统一不同来源的数据口径
2. 统计分析 - 计算关键指标（CAGR、同比等）
3. 预测建模 - 简单的趋势预测
4. 专业绘图 - 生成高质量数据可视化
"""

import uuid
import asyncio
import json
import base64
import io
import sys
from typing import Dict, Any, List, Optional
from datetime import datetime
from contextlib import redirect_stdout, redirect_stderr

from .base import BaseAgent
from ..state import ResearchState, ResearchPhase


class CodeWizard(BaseAgent):
    """
    数据极客 - 代码与数据分析专家

    特点：
    - 唯一有权执行Python代码的Agent
    - 安全的沙箱执行环境
    - 专业的数据分析和可视化
    """

    ANALYSIS_PROMPT = """你是一位资深的数据分析师，擅长用Python进行数据处理和可视化。

## 研究问题
{query}

## 可用数据
{data_points}

## 任务
根据上述数据，生成Python代码完成以下任务：
1. 数据清洗和标准化
2. 计算关键统计指标
3. 生成专业的可视化图表

## 代码要求
- 只能使用以下库: pandas, numpy, matplotlib, seaborn
- 图表要有中文标题和标签
- 使用 plt.rcParams['font.sans-serif'] = ['SimHei'] 支持中文
- 图表保存为 PNG，使用 plt.savefig('chart.png', dpi=150, bbox_inches='tight')
- 代码要有注释，说明每步在做什么
- 打印关键的统计结果

## 输出格式
```json
{{
    "analysis_plan": "分析计划说明",
    "code": "完整的Python代码",
    "expected_outputs": ["预期输出的图表和指标"],
    "data_transformations": ["数据转换说明"]
}}
```"""

    CHART_PROMPT = """你是一位专业的数据可视化专家。

## 研究主题
{topic}

## 数据
{data}

## 图表需求
类型: {chart_type}
标题: {title}

## 任务
生成专业的Python可视化代码。

要求：
1. 使用 matplotlib 或 seaborn
2. 配色要专业（推荐使用 'tableau' 或 'seaborn' 调色板）
3. 图表尺寸 (10, 6) 或 (12, 8)
4. 包含图例、坐标轴标签
5. 中文支持: plt.rcParams['font.sans-serif'] = ['Arial Unicode MS', 'SimHei']
6. 保存图片: plt.savefig('chart.png', dpi=150, bbox_inches='tight', facecolor='white')

输出JSON：
```json
{{
    "code": "完整Python代码",
    "chart_description": "图表说明"
}}
```"""

    CODE_FIX_PROMPT = """你是一位Python专家，需要修复执行失败的代码。

## 原始代码
```python
{code}
```

## 错误信息
{error}

## 标准输出（执行到报错前的输出）
{stdout}

## 任务
分析错误原因并修复代码。常见问题包括：
1. 数据列名不匹配（使用 df.columns 查看实际列名）
2. 数据类型问题（确保数值计算前转换类型）
3. 空数据或缺失值（添加 .dropna() 或填充）
4. 图表绘制问题（检查数据长度是否匹配）

输出JSON：
```json
{{
    "error_analysis": "错误原因分析",
    "fix_description": "修复说明",
    "fixed_code": "修复后的完整Python代码"
}}
```"""

    # 允许的模块白名单
    ALLOWED_MODULES = {
        'pandas', 'numpy', 'matplotlib', 'matplotlib.pyplot',
        'seaborn', 'datetime', 'math', 'statistics', 'json',
        'collections', 're'
    }

    # 禁止的操作（使用正则表达式匹配）
    FORBIDDEN_PATTERNS = [
        r'\bimport\s+os\b',           # import os
        r'\bimport\s+sys\b',          # import sys
        r'\bimport\s+subprocess\b',   # import subprocess
        r'\bos\.',                    # os.xxx
        r'\bsys\.',                   # sys.xxx
        r'\bsubprocess\.',            # subprocess.xxx
        r'\bopen\s*\(',               # open(
        r'\bexec\s*\(',               # exec(
        r'\beval\s*\(',               # eval(
        r'__import__',                # __import__
        r'\bimport\s+requests\b',     # import requests
        r'\brequests\.',              # requests.xxx
        r'\bimport\s+urllib\b',       # import urllib
        r'\burllib\.',                # urllib.xxx
        r'\bimport\s+socket\b',       # import socket
        r'\bsocket\.',                # socket.xxx
        r'\bimport\s+shutil\b',       # import shutil
        r'\bshutil\.',                # shutil.xxx
        r'\bimport\s+pathlib\b',      # import pathlib
        r'\bpathlib\.',               # pathlib.xxx
        r'\bimport\s+pickle\b',       # import pickle
        r'\bpickle\.',                # pickle.xxx
        r'\bimport\s+glob\b',         # import glob
        r'\bglob\.',                  # glob.xxx
        r'\bcompile\s*\(',            # compile(
        r'\b__builtins__\b',          # __builtins__
        r'\b__globals__\b',           # __globals__
        r'\b__code__\b',              # __code__
    ]

    def __init__(self, llm_api_key: str, llm_base_url: str, model: str = "qwen-max"):
        super().__init__(
            name="CodeWizard",
            role="数据极客",
            llm_api_key=llm_api_key,
            llm_base_url=llm_base_url,
            model=model
        )

    async def process(self, state: ResearchState) -> ResearchState:
        """处理入口"""
        if state["phase"] != ResearchPhase.ANALYZING.value:
            # 检查是否有需要分析的数据
            if len(state["data_points"]) >= 3:
                state["phase"] = ResearchPhase.ANALYZING.value
            else:
                return state

        self.add_message(state, "thought", {
            "agent": self.name,
            "content": f"开始数据分析，共有 {len(state['data_points'])} 个数据点..."
        })

        # 执行数据分析
        await self._analyze_data(state)

        # 生成图表
        await self._generate_charts(state)

        return state

    async def _analyze_data(self, state: ResearchState) -> None:
        """分析数据"""
        if not state["data_points"]:
            return

        # 格式化数据点
        data_summary = []
        for dp in state["data_points"]:
            data_summary.append(f"- {dp.get('name')}: {dp.get('value')} {dp.get('unit', '')} ({dp.get('year', 'N/A')})")

        prompt = self.ANALYSIS_PROMPT.format(
            query=state["query"],
            data_points="\n".join(data_summary)
        )

        response = await self.call_llm(
            system_prompt="你是专业的数据分析师，擅长Python数据处理和可视化。",
            user_prompt=prompt,
            json_mode=True
        )

        result = self.parse_json_response(response)

        if result and result.get("code"):
            # 发送代码事件
            self.add_message(state, "code", {
                "agent": self.name,
                "language": "python",
                "code": result["code"],
                "purpose": result.get("analysis_plan", "数据分析")
            })

            # 执行代码（带自愈能力）
            execution_result = await self._execute_with_self_correction(
                result["code"],
                state
            )

            # 记录执行结果
            state["code_executions"].append({
                "id": f"exec_{uuid.uuid4().hex[:8]}",
                "code": execution_result.get("final_code", result["code"]),
                "output": execution_result.get("output", ""),
                "error": execution_result.get("error"),
                "charts": execution_result.get("charts", []),
                "retries": execution_result.get("retries", 0),
                "timestamp": datetime.now().isoformat()
            })

            # 发送执行结果
            self.add_message(state, "code_result", {
                "agent": self.name,
                "success": execution_result.get("success", False),
                "output": execution_result.get("output", "")[:500],
                "has_chart": len(execution_result.get("charts", [])) > 0,
                "retries": execution_result.get("retries", 0)
            })

    async def _execute_with_self_correction(
        self,
        code: str,
        state: ResearchState,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        带自愈能力的代码执行

        特点：
        - 首次执行失败后，将错误信息反馈给LLM修复
        - 最多重试 max_retries 次
        - 记录所有尝试和修复过程
        """
        current_code = code
        retries = 0

        while retries <= max_retries:
            # 执行代码
            result = await self._execute_code(current_code)

            if result.get("success"):
                # 执行成功
                return {
                    "success": True,
                    "output": result.get("output", ""),
                    "charts": result.get("charts", []),
                    "retries": retries,
                    "final_code": current_code
                }

            # 执行失败，尝试修复
            error = result.get("error", "Unknown error")
            stdout = result.get("output", "")

            if retries >= max_retries:
                self.logger.warning(f"Code execution failed after {max_retries} retries: {error}")
                return {
                    "success": False,
                    "error": error,
                    "output": stdout,
                    "charts": [],
                    "retries": retries,
                    "final_code": current_code
                }

            # 发送修复尝试消息
            self.add_message(state, "thought", {
                "agent": self.name,
                "content": f"代码执行失败（第{retries + 1}次），正在自动修复: {error[:100]}..."
            })

            self.logger.info(f"Attempting code self-correction (retry {retries + 1}/{max_retries})")

            # 调用LLM修复代码
            fixed_result = await self._fix_code(current_code, error, stdout)

            if fixed_result and fixed_result.get("fixed_code"):
                current_code = fixed_result["fixed_code"]
                self.logger.info(f"Code fixed: {fixed_result.get('fix_description', 'N/A')}")

                # 发送修复后的代码
                self.add_message(state, "code_fix", {
                    "agent": self.name,
                    "error_analysis": fixed_result.get("error_analysis", ""),
                    "fix_description": fixed_result.get("fix_description", ""),
                    "retry": retries + 1
                })
            else:
                self.logger.warning("Failed to get fixed code from LLM")
                break

            retries += 1

        return {
            "success": False,
            "error": "Max retries exceeded",
            "output": "",
            "charts": [],
            "retries": retries,
            "final_code": current_code
        }

    async def _fix_code(self, code: str, error: str, stdout: str) -> Optional[Dict]:
        """调用LLM修复代码"""
        prompt = self.CODE_FIX_PROMPT.format(
            code=code,
            error=error,
            stdout=stdout[:1000]  # 限制输出长度
        )

        try:
            response = await self.call_llm(
                system_prompt="你是Python代码调试专家，擅长分析错误并修复代码。",
                user_prompt=prompt,
                json_mode=True,
                temperature=0.2
            )
            return self.parse_json_response(response)
        except Exception as e:
            self.logger.error(f"Code fix LLM call failed: {e}")
            return None

    async def _generate_charts(self, state: ResearchState) -> None:
        """为需要图表的章节生成可视化"""
        # 找出需要图表的章节
        chart_sections = [s for s in state["outline"] if s.get("requires_chart")]

        for section in chart_sections[:2]:  # 最多生成2个图表
            # 收集相关数据
            section_data = self._get_section_data(state, section["id"])

            if not section_data:
                continue

            # 生成图表代码
            chart_config = await self._generate_chart_code(
                topic=section["title"],
                data=section_data,
                chart_type="bar" if section.get("section_type") == "quantitative" else "line",
                title=f"{section['title']}分析"
            )

            if chart_config and chart_config.get("code"):
                self.add_message(state, "code", {
                    "agent": self.name,
                    "language": "python",
                    "code": chart_config["code"],
                    "purpose": f"生成图表: {section['title']}"
                })

                # 执行并获取图表
                result = await self._execute_code(chart_config["code"])

                if result.get("charts"):
                    chart_entry = {
                        "id": f"chart_{uuid.uuid4().hex[:8]}",
                        "title": section["title"],
                        "chart_type": "generated",
                        "data": section_data,
                        "code": chart_config["code"],
                        "image_base64": result["charts"][0] if result["charts"] else None,
                        "section_id": section["id"]
                    }
                    state["charts"].append(chart_entry)

                    self.add_message(state, "chart", {
                        "agent": self.name,
                        "title": section["title"],
                        "image": result["charts"][0] if result["charts"] else None
                    })

    def _get_section_data(self, state: ResearchState, section_id: str) -> List[Dict]:
        """获取章节相关数据"""
        related_facts = [f for f in state["facts"] if section_id in f.get("related_sections", [])]
        related_data = []

        for fact in related_facts:
            # 从facts中提取数据点
            if "data_points" in fact:
                related_data.extend(fact["data_points"])

        # 补充全局数据点
        for dp in state["data_points"][:10]:
            related_data.append(dp)

        return related_data

    async def _generate_chart_code(
        self,
        topic: str,
        data: List[Dict],
        chart_type: str,
        title: str
    ) -> Optional[Dict]:
        """生成图表代码"""
        data_str = json.dumps(data, ensure_ascii=False, indent=2)

        prompt = self.CHART_PROMPT.format(
            topic=topic,
            data=data_str,
            chart_type=chart_type,
            title=title
        )

        response = await self.call_llm(
            system_prompt="你是数据可视化专家。",
            user_prompt=prompt,
            json_mode=True
        )

        return self.parse_json_response(response)

    def _clean_code(self, code: str) -> str:
        """
        清理LLM生成的代码，修复常见格式问题

        注意：需要区分「行分隔符」和「字符串内的\\n」
        """
        import re

        # 移除markdown代码块标记
        code = re.sub(r'^```python\s*', '', code, flags=re.MULTILINE)
        code = re.sub(r'^```\s*$', '', code, flags=re.MULTILINE)
        code = re.sub(r'^```json\s*', '', code, flags=re.MULTILINE)

        # 修复 f-string 引号嵌套问题
        # 例如: f'{row['col']}' -> f"{row['col']}"
        # 注意：只修复真正的 f-string，不影响普通字符串如 plt.rcParams['xxx']
        def fix_fstring_quotes(line):
            # 必须有 f' 开头才处理
            if "f'" not in line:
                return line

            # 使用正则匹配 f'...{xxx['key']}...' 模式
            # 匹配条件：f' 开头，内部 {...} 中有 ['...'] 字典访问
            pattern = r"f'([^']*)\{([^}]*)\['([^']*)'\]([^}]*)\}([^']*)'"

            def replace_match(m):
                # 将外层单引号换成双引号，内部保持不变
                return f'f"{m.group(1)}{{{m.group(2)}[\'{m.group(3)}\']{ m.group(4)}}}{m.group(5)}"'

            return re.sub(pattern, replace_match, line)

        # 如果代码已经是正常的多行格式，处理 f-string 问题后返回
        if '\n' in code and '\\n' not in code:
            lines = code.split('\n')
            cleaned_lines = [fix_fstring_quotes(line.rstrip()) for line in lines]
            return '\n'.join(cleaned_lines).strip()

        # 处理 JSON 编码导致的转义问题
        # 策略：先保护字符串内的 \n，再处理行分隔符，最后恢复

        # Step 1: 保护字符串字面量内的 \n (它们应该保持为 \\n)
        # 匹配 f-string, 普通字符串中的 \n
        protected_code = code

        # 用占位符保护字符串内的 \\n
        placeholder = "___NEWLINE_PLACEHOLDER___"

        # 保护 print(f"...\n...") 这类情况
        # 匹配引号内的 \\n 并替换为占位符
        def protect_string_newlines(match):
            s = match.group(0)
            # 在字符串内部，\\n 应该保持，不应该变成真正的换行
            return s.replace('\\n', placeholder)

        # 匹配各种字符串（单引号、双引号、f-string等）
        # 这是一个简化的匹配，处理常见情况
        string_pattern = r'([fFrRbBuU]?)(["\'])((?:(?!\2)(?:\\.|[^\\]))*)\2'
        protected_code = re.sub(string_pattern, protect_string_newlines, protected_code)

        # Step 2: 现在处理行分隔符（不在字符串内的 \\n）
        # 多重转义：\\\\n -> \n, \\n -> \n
        protected_code = protected_code.replace('\\\\\\\\n', '\n')
        protected_code = protected_code.replace('\\\\n', '\n')
        protected_code = protected_code.replace('\\n', '\n')

        # Step 3: 恢复字符串内的 \n
        protected_code = protected_code.replace(placeholder, '\\n')

        # 修复方括号转义
        protected_code = protected_code.replace('\\\\[', '[')
        protected_code = protected_code.replace('\\\\]', ']')
        protected_code = protected_code.replace('\\[', '[')
        protected_code = protected_code.replace('\\]', ']')

        # 修复缩进问题并应用 f-string 修复
        lines = protected_code.split('\n')
        cleaned_lines = []
        for line in lines:
            cleaned_lines.append(fix_fstring_quotes(line.rstrip()))
        code = '\n'.join(cleaned_lines)

        return code.strip()

    async def _execute_code(self, code: str) -> Dict[str, Any]:
        """
        安全执行Python代码

        特点：
        - 代码清理和格式修复
        - 代码安全检查
        - 隔离执行环境
        - 捕获输出和图表
        """
        # 清理代码
        code = self._clean_code(code)
        self.logger.debug(f"Cleaned code:\n{code[:500]}...")

        # 安全检查
        if not self._is_code_safe(code):
            return {
                "success": False,
                "error": "Code contains forbidden operations",
                "output": "",
                "charts": []
            }

        try:
            # 在线程池中执行代码
            result = await asyncio.to_thread(self._execute_in_sandbox, code)
            return result
        except Exception as e:
            self.logger.error(f"Code execution error: {e}")
            return {
                "success": False,
                "error": str(e),
                "output": "",
                "charts": []
            }

    def _is_code_safe(self, code: str) -> bool:
        """检查代码安全性（使用正则表达式）"""
        import re

        for pattern in self.FORBIDDEN_PATTERNS:
            if re.search(pattern, code, re.IGNORECASE):
                self.logger.warning(f"Forbidden pattern detected: {pattern}")
                return False

        return True

    def _execute_in_sandbox(self, code: str) -> Dict[str, Any]:
        """
        沙箱执行代码

        注意：这是一个简化的沙箱，生产环境应使用更安全的方案
        如 Docker 容器或专门的代码执行服务
        """
        import matplotlib
        matplotlib.use('Agg')  # 非交互式后端
        import matplotlib.pyplot as plt

        # 预导入允许的模块
        import pandas as pd
        import numpy as np
        import seaborn as sns

        # 白名单基础模块
        allowed_base_modules = [
            'pandas', 'numpy', 'matplotlib', 'seaborn',
            'datetime', 'math', 'statistics', 'json', 'collections', 're'
        ]

        # 保存原始的 __import__ 函数
        import builtins
        original_import = builtins.__import__

        def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
            """安全的 import 函数，只允许白名单模块"""
            # 检查模块是否在白名单中
            base_module = name.split('.')[0]
            if base_module in allowed_base_modules:
                # 使用真实的 import 来处理（这样可以正确处理 fromlist）
                return original_import(name, globals, locals, fromlist, level)
            raise ImportError(f"Import of '{name}' is not allowed in sandbox")

        # 准备执行环境
        exec_globals = {
            '__builtins__': {
                '__import__': safe_import,
                'print': print,
                'len': len,
                'range': range,
                'enumerate': enumerate,
                'zip': zip,
                'map': map,
                'filter': filter,
                'sorted': sorted,
                'sum': sum,
                'min': min,
                'max': max,
                'abs': abs,
                'round': round,
                'int': int,
                'float': float,
                'str': str,
                'list': list,
                'dict': dict,
                'tuple': tuple,
                'set': set,
                'bool': bool,
                'True': True,
                'False': False,
                'None': None,
                'isinstance': isinstance,
                'type': type,
                'getattr': getattr,
                'setattr': setattr,
                'hasattr': hasattr,
                'callable': callable,
                'iter': iter,
                'next': next,
                'reversed': reversed,
                'slice': slice,
                'all': all,
                'any': any,
                'chr': chr,
                'ord': ord,
                'hex': hex,
                'bin': bin,
                'oct': oct,
                'pow': pow,
                'divmod': divmod,
                'format': format,
                'repr': repr,
                'hash': hash,
                'id': id,
                'input': lambda *args: '',  # 禁用 input
                'open': None,  # 禁用 open
            },
            # 直接提供模块引用
            'pd': pd,
            'np': np,
            'plt': plt,
            'sns': sns,
            'pandas': pd,
            'numpy': np,
            'matplotlib': matplotlib,
        }

        # 捕获输出
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        charts = []

        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(code, exec_globals)

            # 检查是否生成了图表
            fig = plt.gcf()
            if fig.get_axes():
                buf = io.BytesIO()
                fig.savefig(buf, format='png', dpi=150, bbox_inches='tight', facecolor='white')
                buf.seek(0)
                charts.append(base64.b64encode(buf.read()).decode('utf-8'))
                plt.close(fig)

            return {
                "success": True,
                "output": stdout_capture.getvalue(),
                "error": stderr_capture.getvalue() if stderr_capture.getvalue() else None,
                "charts": charts
            }

        except Exception as e:
            plt.close('all')
            return {
                "success": False,
                "output": stdout_capture.getvalue(),
                "error": str(e),
                "charts": []
            }
