import { request } from './request'

export interface TableInfo {
  name: string
  size: string
  column_count: number
  row_count: number
}

export interface ColumnInfo {
  name: string
  type: string
  max_length?: number
  nullable: boolean
  default?: string
}

export interface IndexInfo {
  name: string
  definition: string
}

export interface TableSchema {
  table_name: string
  columns: ColumnInfo[]
  primary_keys: string[]
  indexes: IndexInfo[]
}

export interface TableDataResponse {
  table_name: string
  columns: string[]
  rows: Record<string, unknown>[]
  total: number
  limit: number
  offset: number
}

export interface QueryResponse {
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
}

/**
 * 获取所有表
 */
export function getTables() {
  return request.get<TableInfo[]>('/database/tables')
}

/**
 * 获取表结构
 */
export function getTableSchema(tableName: string) {
  return request.get<TableSchema>(`/database/tables/${tableName}/schema`)
}

/**
 * 获取表数据
 */
export function getTableData(
  tableName: string,
  params?: {
    limit?: number
    offset?: number
    order_by?: string
    order_dir?: 'asc' | 'desc'
  }
) {
  return request.get<TableDataResponse>(`/database/tables/${tableName}/data`, { params })
}

/**
 * 执行 SQL 查询
 */
export function executeQuery(sql: string, limit: number = 100) {
  return request.post<QueryResponse>('/database/query', { sql, limit })
}
