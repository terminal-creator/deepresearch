from typing import Dict, Any, Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from starlette.status import HTTP_200_OK, HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR
import logging

from service import ResearchService, ServiceConfig
from service.dr_g import serialize_event  # 导入序列化函数

# V2 导入
from service.deep_research_v2.service import DeepResearchV2Service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ResearchRouter")

# 创建路由实例
router = APIRouter(prefix="/research", tags=["research"])

# 请求模型
class ResearchRequest(BaseModel):
    """深度研究请求模型"""
    query: str
    max_iterations: Optional[int] = 3
    kb_name: Optional[str] = None  # 本地知识库名称
    search_web: Optional[bool] = True  # 是否搜索网络
    search_local: Optional[bool] = True  # 是否搜索本地知识库
    version: Optional[Literal["v1", "v2"]] = "v2"  # 版本选择 (v2: 多智能体架构，推荐)

    class Config:
        json_schema_extra = {
            "example": {
                "query": "中国安责险的市场现状和未来发展趋势是什么？请提供具体数据支持。",
                "max_iterations": 3,
                "kb_name": None,
                "search_web": True,
                "search_local": True,
                "version": "v2"
            }
        }

# 获取服务实例
def get_research_service():
    """获取研究服务实例"""
    config = ServiceConfig.get_api_config()
    research_service = ResearchService(
        search_api_key=config.get('bochaai_api_key'),
        llm_api_key=config.get('dashscope_api_key'),
        llm_base_url=config.get('dashscope_base_url')
    )
    return {"research_service": research_service}


def get_research_service_v2():
    """获取 V2 研究服务实例"""
    config = ServiceConfig.get_api_config()
    service = DeepResearchV2Service(
        llm_api_key=config.get('dashscope_api_key'),
        llm_base_url=config.get('dashscope_base_url'),
        search_api_key=config.get('bochaai_api_key'),
        model="qwen-max"
    )
    return service

@router.post("/stream", status_code=HTTP_200_OK)
async def stream_research(
    request: ResearchRequest,
    services: Dict[str, Any] = Depends(get_research_service)
):
    """
    深度研究接口 - 流式输出

    对用户的研究问题执行全面的深度研究，包括问题分解、网络搜索、信息整合、数据分析和报告生成。
    使用 Server-Sent Events (SSE) 格式流式返回整个研究过程和结果。

    支持两个版本：
    - v1: 传统 ReAct 架构
    - v2: 多智能体协作网络（推荐）

    Args:
        request: 包含研究问题和配置的请求体

    Returns:
        流式响应，包含研究过程和结果的 SSE 格式数据
    """
    # 根据版本选择服务
    if request.version == "v2":
        logger.info(f"Using DeepResearch V2 for query: {request.query[:50]}...")
        service_v2 = get_research_service_v2()

        async def generate_sse_v2():
            try:
                async for event in service_v2.research(
                    query=request.query,
                    kb_name=request.kb_name
                ):
                    yield event
            except Exception as e:
                logger.error(f"V2 Research error: {e}")
                error_event = serialize_event({"type": "error", "content": str(e)})
                yield f"data: {error_event}\n\n"

        return StreamingResponse(
            generate_sse_v2(),
            media_type="text/event-stream"
        )

    # V1 原有逻辑
    research_service = services["research_service"]

    async def generate_sse():
        try:
            async for event in research_service.research_stream(
                query=request.query,
                max_iterations=request.max_iterations,
                kb_name=request.kb_name,
                search_web=request.search_web,
                search_local=request.search_local
            ):
                # 将事件转换为 SSE 格式
                yield f"data: {event}\n\n"
        except Exception as e:
            # 使用serialize_event进行错误处理，确保JSON格式正确
            error_event = serialize_event({"type": "error", "content": str(e)})
            yield f"data: {error_event}\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream"
    )

@router.get("/stream", status_code=HTTP_200_OK)
async def stream_research_get(
    query: str = Query(..., description="研究问题", example="中国安责险的市场现状和未来发展趋势是什么？"),
    max_iterations: int = Query(3, description="最大迭代次数", ge=1, le=5),
    kb_name: Optional[str] = Query(None, description="本地知识库名称"),
    search_web: bool = Query(True, description="是否搜索网络"),
    search_local: bool = Query(True, description="是否搜索本地知识库"),
    version: str = Query("v1", description="版本: v1 或 v2"),
    services: Dict[str, Any] = Depends(get_research_service)
):
    """
    深度研究接口 - GET方式流式输出

    对用户的研究问题执行全面的深度研究，包括问题分解、网络搜索、信息整合、数据分析和报告生成。
    使用 Server-Sent Events (SSE) 格式流式返回整个研究过程和结果。

    支持两个版本：
    - v1: 传统 ReAct 架构
    - v2: 多智能体协作网络（推荐）

    Args:
        query: 研究问题
        max_iterations: 最大迭代次数（范围：1-5）
        version: 版本选择 (v1 或 v2)

    Returns:
        流式响应，包含研究过程和结果的 SSE 格式数据
    """
    # 根据版本选择服务
    if version == "v2":
        logger.info(f"Using DeepResearch V2 (GET) for query: {query[:50]}...")
        service_v2 = get_research_service_v2()

        async def generate_sse_v2():
            try:
                async for event in service_v2.research(
                    query=query,
                    kb_name=kb_name
                ):
                    yield event
            except Exception as e:
                logger.error(f"V2 Research error: {e}")
                error_event = serialize_event({"type": "error", "content": str(e)})
                yield f"data: {error_event}\n\n"

        return StreamingResponse(
            generate_sse_v2(),
            media_type="text/event-stream"
        )

    # V1 原有逻辑
    research_service = services["research_service"]

    async def generate_sse():
        try:
            async for event in research_service.research_stream(
                query=query,
                max_iterations=max_iterations,
                kb_name=kb_name,
                search_web=search_web,
                search_local=search_local
            ):
                # 将事件转换为 SSE 格式
                yield f"data: {event}\n\n"
        except Exception as e:
            # 使用serialize_event进行错误处理，确保JSON格式正确
            error_event = serialize_event({"type": "error", "content": str(e)})
            yield f"data: {error_event}\n\n"

    return StreamingResponse(
        generate_sse(),
        media_type="text/event-stream"
    )