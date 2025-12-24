"""
DeepResearch V2.0 - 服务入口

提供与现有路由兼容的接口，支持 SSE 流式输出。
"""

import os
import json
import uuid
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from datetime import datetime

from .graph import DeepResearchGraph

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("DeepResearchV2Service")


class DeepResearchV2Service:
    """
    DeepResearch V2.0 服务

    特点：
    - 多智能体协作
    - 对抗式质检
    - 代码解释器
    - 流式输出
    """

    def __init__(
        self,
        llm_api_key: Optional[str] = None,
        llm_base_url: Optional[str] = None,
        search_api_key: Optional[str] = None,
        model: str = "qwen-max",
        max_iterations: int = 3
    ):
        """
        初始化服务

        Args:
            llm_api_key: LLM API 密钥（默认从环境变量读取）
            llm_base_url: LLM API 基础 URL（默认从环境变量读取）
            search_api_key: 搜索 API 密钥（默认从环境变量读取）
            model: 模型名称
            max_iterations: 最大迭代次数
        """
        self.llm_api_key = llm_api_key or os.getenv("DASHSCOPE_API_KEY", "")
        self.llm_base_url = llm_base_url or os.getenv("LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        self.search_api_key = search_api_key or os.getenv("BOCHA_API_KEY", "")
        self.model = model
        self.max_iterations = max_iterations

        # 创建工作流图
        self.graph = DeepResearchGraph(
            llm_api_key=self.llm_api_key,
            llm_base_url=self.llm_base_url,
            search_api_key=self.search_api_key,
            model=self.model,
            max_iterations=self.max_iterations
        )

        logger.info(f"DeepResearch V2 Service initialized with model: {model}")

    async def research(
        self,
        query: str,
        session_id: Optional[str] = None,
        kb_name: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        执行深度研究（SSE 流式输出）

        Args:
            query: 用户问题
            session_id: 会话ID（可选）
            kb_name: 知识库名称（可选）

        Yields:
            SSE 格式的事件字符串
        """
        if not session_id:
            session_id = str(uuid.uuid4())

        logger.info(f"Starting research for session {session_id}: {query[:50]}...")

        try:
            async for event in self.graph.run(query, session_id):
                # 转换为 SSE 格式
                yield self._format_sse(event)

        except Exception as e:
            logger.error(f"Research error: {e}")
            yield self._format_sse({
                "type": "error",
                "content": str(e)
            })

        # 发送结束标记
        yield "data: [DONE]\n\n"

    def _format_sse(self, event: Dict[str, Any]) -> str:
        """格式化为 SSE 事件"""
        return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    async def research_sync(
        self,
        query: str,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        同步执行研究（返回完整结果）

        Args:
            query: 用户问题
            session_id: 会话ID

        Returns:
            完整的研究结果
        """
        if not session_id:
            session_id = str(uuid.uuid4())

        state = await self.graph.run_sync(query, session_id)

        return {
            "session_id": session_id,
            "query": query,
            "final_report": state.get("final_report", ""),
            "quality_score": state.get("quality_score", 0.0),
            "outline": state.get("outline", []),
            "facts": state.get("facts", []),
            "data_points": state.get("data_points", []),
            "charts": state.get("charts", []),
            "references": state.get("references", []),
            "insights": state.get("insights", []),
            "iterations": state.get("iteration", 0),
            "phase": state.get("phase", ""),
            "logs": state.get("logs", [])
        }


def create_service(
    llm_api_key: Optional[str] = None,
    llm_base_url: Optional[str] = None,
    search_api_key: Optional[str] = None,
    model: str = "qwen-max"
) -> DeepResearchV2Service:
    """
    工厂函数：创建 DeepResearch V2 服务

    Args:
        llm_api_key: LLM API 密钥
        llm_base_url: LLM API 基础 URL
        search_api_key: 搜索 API 密钥
        model: 模型名称

    Returns:
        DeepResearchV2Service 实例
    """
    return DeepResearchV2Service(
        llm_api_key=llm_api_key,
        llm_base_url=llm_base_url,
        search_api_key=search_api_key,
        model=model
    )
