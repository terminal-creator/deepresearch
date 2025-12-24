"""
DeepResearch V2.0 - LangGraph 工作流

实现多智能体协作的状态机图：
Plan -> Research -> Analyze -> Write -> Review -> (Revise) -> Complete

使用 LangGraph 实现循环和条件分支。
"""

import logging
import asyncio
from typing import Dict, Any, List, Literal, AsyncGenerator
from datetime import datetime

# LangGraph 导入 - 如果没有安装则使用简化版本
try:
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    logging.warning("LangGraph not installed. Using simplified workflow.")

from .state import ResearchState, ResearchPhase, create_initial_state
from .agents import ChiefArchitect, DeepScout, CodeWizard, CriticMaster, LeadWriter, DataAnalyst

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("DeepResearchGraph")


class DeepResearchGraph:
    """
    DeepResearch V2.0 工作流图

    实现完整的多智能体协作流程：
    1. Plan (ChiefArchitect) - 分析问题，生成研究大纲
    2. Research (DeepScout) - 并行深度搜索
    3. Analyze (CodeWizard) - 数据分析和可视化
    4. Write (LeadWriter) - 撰写报告
    5. Review (CriticMaster) - 对抗式审核
    6. Revise (LeadWriter) - 修订（如果需要）
    """

    def __init__(
        self,
        llm_api_key: str,
        llm_base_url: str,
        search_api_key: str,
        model: str = "qwen-max",
        max_iterations: int = 3
    ):
        """初始化工作流"""
        self.llm_api_key = llm_api_key
        self.llm_base_url = llm_base_url
        self.search_api_key = search_api_key
        self.model = model
        self.max_iterations = max_iterations

        # 初始化各个Agent
        self.architect = ChiefArchitect(llm_api_key, llm_base_url, model)
        self.scout = DeepScout(llm_api_key, llm_base_url, search_api_key, "qwen-plus")
        self.data_analyst = DataAnalyst(llm_api_key, llm_base_url, model)
        self.wizard = CodeWizard(llm_api_key, llm_base_url, model)
        self.critic = CriticMaster(llm_api_key, llm_base_url, model)
        self.writer = LeadWriter(llm_api_key, llm_base_url, model)

        # 构建图
        if LANGGRAPH_AVAILABLE:
            self.graph = self._build_langgraph()
        else:
            self.graph = None

    def _build_langgraph(self):
        """构建 LangGraph 状态图"""
        # 定义图
        workflow = StateGraph(ResearchState)

        # 添加节点
        workflow.add_node("plan", self._plan_node)
        workflow.add_node("research", self._research_node)
        workflow.add_node("analyze", self._analyze_node)
        workflow.add_node("write", self._write_node)
        workflow.add_node("review", self._review_node)
        workflow.add_node("revise", self._revise_node)

        # 设置入口
        workflow.set_entry_point("plan")

        # 添加边
        workflow.add_edge("plan", "research")
        workflow.add_edge("research", "analyze")
        workflow.add_edge("analyze", "write")
        workflow.add_edge("write", "review")

        # 条件边：审核后决定下一步
        workflow.add_conditional_edges(
            "review",
            self._should_revise,
            {
                "revise": "revise",
                "complete": END
            }
        )

        # 修订后回到审核
        workflow.add_edge("revise", "review")

        return workflow.compile()

    async def _plan_node(self, state: ResearchState) -> Dict[str, Any]:
        """规划节点"""
        logger.info("Executing Plan node...")
        # 创建状态副本以避免直接修改
        state = dict(state)
        state["phase"] = ResearchPhase.INIT.value
        result = await self.architect.process(state)
        return dict(result)

    async def _research_node(self, state: ResearchState) -> Dict[str, Any]:
        """研究节点"""
        logger.info("Executing Research node...")
        state = dict(state)
        state["phase"] = ResearchPhase.RESEARCHING.value
        result = await self.scout.process(state)
        return dict(result)

    async def _analyze_node(self, state: ResearchState) -> Dict[str, Any]:
        """分析节点"""
        logger.info("Executing Analyze node...")
        state = dict(state)
        state["phase"] = ResearchPhase.ANALYZING.value
        result = await self.wizard.process(state)
        return dict(result)

    async def _write_node(self, state: ResearchState) -> Dict[str, Any]:
        """写作节点"""
        logger.info("Executing Write node...")
        state = dict(state)
        state["phase"] = ResearchPhase.WRITING.value
        result = await self.writer.process(state)
        return dict(result)

    async def _review_node(self, state: ResearchState) -> Dict[str, Any]:
        """审核节点"""
        logger.info("Executing Review node...")
        state = dict(state)
        state["phase"] = ResearchPhase.REVIEWING.value
        result = await self.critic.process(state)
        return dict(result)

    async def _revise_node(self, state: ResearchState) -> Dict[str, Any]:
        """修订节点"""
        logger.info("Executing Revise node...")
        state = dict(state)
        state["phase"] = ResearchPhase.REVISING.value
        result = await self.writer.process(state)
        return dict(result)

    def _should_revise(self, state: ResearchState) -> Literal["revise", "complete"]:
        """决定是否需要修订"""
        # 检查是否有未解决的严重问题
        if state["unresolved_issues"] > 0 and state["iteration"] < state["max_iterations"]:
            return "revise"
        return "complete"

    async def run(
        self,
        query: str,
        session_id: str
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        执行研究流程（流式输出）

        Args:
            query: 用户问题
            session_id: 会话ID

        Yields:
            SSE 事件字典
        """
        # 创建初始状态
        state = create_initial_state(query, session_id)
        state["max_iterations"] = self.max_iterations

        yield {
            "type": "research_start",
            "query": query,
            "session_id": session_id,
            "timestamp": datetime.now().isoformat()
        }

        if LANGGRAPH_AVAILABLE and self.graph:
            # 使用 LangGraph 执行
            async for event in self._run_with_langgraph(state):
                yield event
        else:
            # 使用简化版本执行
            async for event in self._run_simplified(state):
                yield event

    async def _run_with_langgraph(self, state: ResearchState) -> AsyncGenerator[Dict[str, Any], None]:
        """使用 LangGraph 执行"""
        # 追踪已输出的消息数量，避免重复
        yielded_count = 0

        try:
            # LangGraph 的流式执行
            async for output in self.graph.astream(state):
                # 提取消息并输出
                for node_name, node_state in output.items():
                    if isinstance(node_state, dict) and "messages" in node_state:
                        messages = node_state["messages"]
                        # 只输出新消息（跳过已输出的）
                        new_messages = messages[yielded_count:]
                        for message in new_messages:
                            yield message
                        yielded_count = len(messages)

        except Exception as e:
            logger.error(f"LangGraph execution error: {e}")
            yield {"type": "error", "content": str(e)}

    async def _run_simplified(self, state: ResearchState) -> AsyncGenerator[Dict[str, Any], None]:
        """
        简化版执行流程（不依赖 LangGraph）

        使用 asyncio.Queue 实现实时流式输出
        """
        # 创建消息队列用于实时输出
        message_queue = asyncio.Queue()
        state["_message_queue"] = message_queue

        async def run_agent_with_streaming(agent):
            """执行 agent 并实时 yield 消息"""
            # 启动 agent 处理任务
            task = asyncio.create_task(agent.process(state))

            # 在任务执行期间持续从队列获取消息
            while not task.done():
                try:
                    msg = await asyncio.wait_for(message_queue.get(), timeout=0.1)
                    yield msg
                except asyncio.TimeoutError:
                    continue
                except Exception:
                    continue

            # 等待任务完成（获取可能的异常）
            try:
                await task
            except Exception as e:
                logger.error(f"Agent {agent.name} error: {e}")

            # 清空剩余的消息
            while not message_queue.empty():
                try:
                    msg = message_queue.get_nowait()
                    yield msg
                except:
                    break

        try:
            # Phase 1: Plan
            yield {"type": "phase", "phase": "planning", "content": "开始规划研究..."}
            async for msg in run_agent_with_streaming(self.architect):
                yield msg
            state["messages"] = []

            # Phase 2: Research (这是最需要实时输出的阶段)
            yield {"type": "phase", "phase": "researching", "content": "开始深度搜索..."}
            async for msg in run_agent_with_streaming(self.scout):
                yield msg
            state["messages"] = []

            # Phase 3: Analyze
            yield {"type": "phase", "phase": "analyzing", "content": "开始数据分析..."}
            async for msg in run_agent_with_streaming(self.data_analyst):
                yield msg
            state["messages"] = []
            async for msg in run_agent_with_streaming(self.wizard):
                yield msg
            state["messages"] = []

            # Phase 4: Write
            yield {"type": "phase", "phase": "writing", "content": "开始撰写报告..."}
            async for msg in run_agent_with_streaming(self.writer):
                yield msg
            state["messages"] = []

            # Phase 5 & 6: Review & Revise/Re-Research Loop
            while state["iteration"] < state["max_iterations"]:
                yield {"type": "phase", "phase": "reviewing", "content": f"审核中（第 {state['iteration'] + 1} 轮）..."}
                async for msg in run_agent_with_streaming(self.critic):
                    yield msg
                state["messages"] = []

                if state["phase"] == ResearchPhase.COMPLETED.value:
                    break

                if state["phase"] == ResearchPhase.RE_RESEARCHING.value:
                    yield {"type": "phase", "phase": "re_researching", "content": "根据审核反馈补充搜索..."}
                    async for msg in run_agent_with_streaming(self.scout):
                        yield msg
                    state["messages"] = []

                    yield {"type": "phase", "phase": "rewriting", "content": "基于新信息重新撰写..."}
                    state["phase"] = ResearchPhase.WRITING.value
                    async for msg in run_agent_with_streaming(self.writer):
                        yield msg
                    state["messages"] = []

                elif state["phase"] == ResearchPhase.REVISING.value:
                    yield {"type": "phase", "phase": "revising", "content": "根据反馈修订报告..."}
                    async for msg in run_agent_with_streaming(self.writer):
                        yield msg
                    state["messages"] = []
                else:
                    break

            # 完成
            yield {
                "type": "research_complete",
                "final_report": state.get("final_report", ""),
                "quality_score": state.get("quality_score", 0.0),
                "facts_count": len(state.get("facts", [])),
                "charts_count": len(state.get("charts", [])),
                "iterations": state.get("iteration", 0),
                "references": state.get("references", [])
            }

        except Exception as e:
            logger.error(f"Simplified execution error: {e}")
            yield {"type": "error", "content": str(e)}
        finally:
            # 清理队列
            state["_message_queue"] = None

    async def run_sync(self, query: str, session_id: str) -> ResearchState:
        """
        同步执行（返回最终状态）

        用于不需要流式输出的场景
        """
        state = create_initial_state(query, session_id)
        state["max_iterations"] = self.max_iterations

        # 依次执行各阶段
        state = await self.architect.process(state)
        state = await self.scout.process(state)
        state = await self.data_analyst.process(state)
        state = await self.wizard.process(state)
        state = await self.writer.process(state)

        # 审核修订循环（支持智能路由）
        while state["iteration"] < state["max_iterations"]:
            state = await self.critic.process(state)

            if state["phase"] == ResearchPhase.COMPLETED.value:
                break

            # 智能路由：需要补充搜索
            if state["phase"] == ResearchPhase.RE_RESEARCHING.value:
                state = await self.scout.process(state)
                state["phase"] = ResearchPhase.WRITING.value
                state = await self.writer.process(state)

            # 仅需要文字修订
            elif state["phase"] == ResearchPhase.REVISING.value:
                state = await self.writer.process(state)
            else:
                break

        return state


def create_research_graph(
    llm_api_key: str,
    llm_base_url: str,
    search_api_key: str,
    model: str = "qwen-max"
) -> DeepResearchGraph:
    """
    工厂函数：创建 DeepResearch 工作流图

    Args:
        llm_api_key: LLM API 密钥
        llm_base_url: LLM API 基础 URL
        search_api_key: 搜索 API 密钥
        model: 模型名称

    Returns:
        DeepResearchGraph 实例
    """
    return DeepResearchGraph(
        llm_api_key=llm_api_key,
        llm_base_url=llm_base_url,
        search_api_key=search_api_key,
        model=model
    )
