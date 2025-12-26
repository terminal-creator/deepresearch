"""数据库探索路由 - PostgreSQL 可视化"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from core.database import get_db
from models.user import User
from router.auth_router import get_current_user_required
from service.database_explorer import DatabaseExplorer

router = APIRouter(prefix="/database", tags=["数据库探索"])


# ========== Schemas ==========

class TableInfo(BaseModel):
    """表信息"""
    name: str
    size: str
    column_count: int
    row_count: int


class ColumnInfo(BaseModel):
    """列信息"""
    name: str
    type: str
    max_length: Optional[int] = None
    nullable: bool
    default: Optional[str] = None


class IndexInfo(BaseModel):
    """索引信息"""
    name: str
    definition: str


class TableSchema(BaseModel):
    """表结构"""
    table_name: str
    columns: List[ColumnInfo]
    primary_keys: List[str]
    indexes: List[IndexInfo]


class TableDataResponse(BaseModel):
    """表数据响应"""
    table_name: str
    columns: List[str]
    rows: List[dict]
    total: int
    limit: int
    offset: int


class QueryRequest(BaseModel):
    """查询请求"""
    sql: str = Field(..., description="SQL 查询语句（仅支持 SELECT）")
    limit: int = Field(100, ge=1, le=1000, description="结果限制")


class QueryResponse(BaseModel):
    """查询响应"""
    columns: List[str]
    rows: List[dict]
    row_count: int


# ========== Routes ==========

@router.get("/tables", response_model=List[TableInfo])
async def get_tables(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """获取当前数据库的所有表"""
    explorer = DatabaseExplorer(db)
    try:
        tables = explorer.get_tables()
        return [TableInfo(**t) for t in tables]
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取表列表失败: {str(e)}"
        )


@router.get("/tables/{table_name}/schema", response_model=TableSchema)
async def get_table_schema(
    table_name: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """获取表结构"""
    explorer = DatabaseExplorer(db)
    try:
        schema = explorer.get_table_schema(table_name)
        return TableSchema(
            table_name=schema["table_name"],
            columns=[ColumnInfo(**c) for c in schema["columns"]],
            primary_keys=schema["primary_keys"],
            indexes=[IndexInfo(**i) for i in schema["indexes"]],
        )
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取表结构失败: {str(e)}"
        )


@router.get("/tables/{table_name}/data", response_model=TableDataResponse)
async def get_table_data(
    table_name: str,
    limit: int = 100,
    offset: int = 0,
    order_by: Optional[str] = None,
    order_dir: str = "asc",
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """获取表数据（分页）"""
    if limit > 1000:
        limit = 1000

    explorer = DatabaseExplorer(db)
    try:
        data = explorer.get_table_data(table_name, limit, offset, order_by, order_dir)
        return TableDataResponse(**data)
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取表数据失败: {str(e)}"
        )


@router.post("/query", response_model=QueryResponse)
async def execute_query(
    request: QueryRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
):
    """执行只读 SQL 查询（仅支持 SELECT）"""
    explorer = DatabaseExplorer(db)
    try:
        result = explorer.execute_query(request.sql, request.limit)
        return QueryResponse(**result)
    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查询执行失败: {str(e)}"
        )
