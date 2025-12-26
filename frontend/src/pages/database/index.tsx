import { useEffect, useState, useCallback } from 'react'
import {
  Card,
  Button,
  Table,
  Tabs,
  Input,
  message,
  Empty,
  Spin,
  Typography,
  Tag,
  Descriptions,
  Space,
  Pagination,
} from 'antd'
import {
  DatabaseOutlined,
  TableOutlined,
  CodeOutlined,
  ReloadOutlined,
  KeyOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useSnapshot } from 'valtio'
import { authState } from '@/store/auth'
import { useNavigate } from 'react-router-dom'
import * as api from '@/api'
import type { TableInfo, TableSchema, TableDataResponse, QueryResponse } from '@/api/database'
import styles from './index.module.scss'

const { Text, Title } = Typography
const { TextArea } = Input

export default function DatabasePage() {
  const navigate = useNavigate()
  const { isLoggedIn } = useSnapshot(authState)

  // 状态
  const [tables, setTables] = useState<TableInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null)
  const [tableData, setTableData] = useState<TableDataResponse | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataPage, setDataPage] = useState(1)
  const [dataPageSize, setDataPageSize] = useState(20)

  // SQL 查询
  const [sqlQuery, setSqlQuery] = useState('')
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null)
  const [queryLoading, setQueryLoading] = useState(false)

  // 获取表列表
  const fetchTables = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.database.getTables()
      if (res.data) {
        setTables(res.data)
      }
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '获取表列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      fetchTables()
    }
  }, [isLoggedIn, fetchTables])

  // 获取表结构
  const fetchTableSchema = useCallback(async (tableName: string) => {
    setSchemaLoading(true)
    try {
      const res = await api.database.getTableSchema(tableName)
      if (res.data) {
        setTableSchema(res.data)
      }
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '获取表结构失败')
    } finally {
      setSchemaLoading(false)
    }
  }, [])

  // 获取表数据
  const fetchTableData = useCallback(async (tableName: string, page: number, pageSize: number) => {
    setDataLoading(true)
    try {
      const res = await api.database.getTableData(tableName, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
      })
      if (res.data) {
        setTableData(res.data)
      }
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '获取表数据失败')
    } finally {
      setDataLoading(false)
    }
  }, [])

  // 选择表
  const handleSelectTable = (tableName: string) => {
    setSelectedTable(tableName)
    setDataPage(1)
    fetchTableSchema(tableName)
    fetchTableData(tableName, 1, dataPageSize)
    // 设置默认 SQL 查询
    setSqlQuery(`SELECT * FROM "${tableName}" LIMIT 100`)
  }

  // 翻页
  const handlePageChange = (page: number, pageSize?: number) => {
    const newPageSize = pageSize || dataPageSize
    setDataPage(page)
    setDataPageSize(newPageSize)
    if (selectedTable) {
      fetchTableData(selectedTable, page, newPageSize)
    }
  }

  // 执行查询
  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) {
      message.warning('请输入 SQL 查询语句')
      return
    }
    setQueryLoading(true)
    try {
      const res = await api.database.executeQuery(sqlQuery, 100)
      if (res.data) {
        setQueryResult(res.data)
        message.success(`查询成功，返回 ${res.data.row_count} 条记录`)
      }
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '查询执行失败')
      setQueryResult(null)
    } finally {
      setQueryLoading(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className={styles['database-page']}>
        <div className={styles['empty-state']}>
          <Empty description="请先登录" />
          <Button type="primary" onClick={() => navigate('/login')}>
            去登录
          </Button>
        </div>
      </div>
    )
  }

  // 表列表
  const renderTableList = () => (
    <div className={styles['table-list']}>
      <div className={styles['list-header']}>
        <Text strong>数据表 ({tables.length})</Text>
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          onClick={fetchTables}
          loading={loading}
        />
      </div>
      <Spin spinning={loading}>
        {tables.length === 0 ? (
          <Empty description="暂无数据表" />
        ) : (
          <div className={styles['table-items']}>
            {tables.map((table) => (
              <div
                key={table.name}
                className={`${styles['table-item']} ${selectedTable === table.name ? styles['active'] : ''}`}
                onClick={() => handleSelectTable(table.name)}
              >
                <div className={styles['table-icon']}>
                  <TableOutlined />
                </div>
                <div className={styles['table-info']}>
                  <Text ellipsis={{ tooltip: table.name }} strong>
                    {table.name}
                  </Text>
                  <div className={styles['table-meta']}>
                    <span>{table.row_count} 行</span>
                    <span>{table.size}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </div>
  )

  // 表结构
  const renderSchema = () => (
    <Spin spinning={schemaLoading}>
      {tableSchema ? (
        <div className={styles['schema-content']}>
          <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="表名">{tableSchema.table_name}</Descriptions.Item>
            <Descriptions.Item label="列数">{tableSchema.columns.length}</Descriptions.Item>
            <Descriptions.Item label="主键">
              {tableSchema.primary_keys.join(', ') || '无'}
            </Descriptions.Item>
          </Descriptions>

          <Title level={5}>列信息</Title>
          <Table
            size="small"
            dataSource={tableSchema.columns}
            rowKey="name"
            pagination={false}
            columns={[
              {
                title: '列名',
                dataIndex: 'name',
                key: 'name',
                render: (name, record) => (
                  <Space>
                    {tableSchema.primary_keys.includes(name) && (
                      <KeyOutlined style={{ color: '#faad14' }} />
                    )}
                    <Text strong>{name}</Text>
                  </Space>
                ),
              },
              {
                title: '类型',
                dataIndex: 'type',
                key: 'type',
                render: (type, record) => (
                  <Tag color="blue">
                    {type}
                    {record.max_length && `(${record.max_length})`}
                  </Tag>
                ),
              },
              {
                title: '可空',
                dataIndex: 'nullable',
                key: 'nullable',
                width: 80,
                render: (nullable) => (
                  <Tag color={nullable ? 'default' : 'red'}>
                    {nullable ? 'YES' : 'NO'}
                  </Tag>
                ),
              },
              {
                title: '默认值',
                dataIndex: 'default',
                key: 'default',
                ellipsis: true,
                render: (value) => value || '-',
              },
            ]}
          />

          {tableSchema.indexes.length > 0 && (
            <>
              <Title level={5} style={{ marginTop: 16 }}>索引</Title>
              <Table
                size="small"
                dataSource={tableSchema.indexes}
                rowKey="name"
                pagination={false}
                columns={[
                  { title: '索引名', dataIndex: 'name', key: 'name' },
                  {
                    title: '定义',
                    dataIndex: 'definition',
                    key: 'definition',
                    ellipsis: true,
                  },
                ]}
              />
            </>
          )}
        </div>
      ) : (
        <Empty description="请先选择一个表" />
      )}
    </Spin>
  )

  // 表数据
  const renderData = () => (
    <Spin spinning={dataLoading}>
      {tableData ? (
        <div className={styles['data-content']}>
          <Table
            size="small"
            dataSource={tableData.rows}
            rowKey={(_, index) => index?.toString() || '0'}
            scroll={{ x: 'max-content' }}
            pagination={false}
            columns={tableData.columns.map((col) => ({
              title: col,
              dataIndex: col,
              key: col,
              ellipsis: true,
              width: 150,
              render: (value) => {
                if (value === null) return <Text type="secondary">NULL</Text>
                if (typeof value === 'object') return JSON.stringify(value)
                return String(value)
              },
            }))}
          />
          <div className={styles['data-pagination']}>
            <Pagination
              current={dataPage}
              pageSize={dataPageSize}
              total={tableData.total}
              onChange={handlePageChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 条`}
            />
          </div>
        </div>
      ) : (
        <Empty description="请先选择一个表" />
      )}
    </Spin>
  )

  // SQL 查询
  const renderSqlEditor = () => (
    <div className={styles['sql-editor']}>
      <div className={styles['sql-input']}>
        <TextArea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          placeholder="输入 SELECT 查询语句..."
          autoSize={{ minRows: 4, maxRows: 10 }}
        />
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={handleExecuteQuery}
          loading={queryLoading}
          style={{ marginTop: 8 }}
        >
          执行查询
        </Button>
      </div>
      {queryResult && (
        <div className={styles['query-result']}>
          <Text type="secondary">返回 {queryResult.row_count} 条记录</Text>
          <Table
            size="small"
            dataSource={queryResult.rows}
            rowKey={(_, index) => index?.toString() || '0'}
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 20 }}
            columns={queryResult.columns.map((col) => ({
              title: col,
              dataIndex: col,
              key: col,
              ellipsis: true,
              width: 150,
              render: (value) => {
                if (value === null) return <Text type="secondary">NULL</Text>
                if (typeof value === 'object') return JSON.stringify(value)
                return String(value)
              },
            }))}
          />
        </div>
      )}
    </div>
  )

  return (
    <div className={styles['database-page']}>
      <div className={styles['header']}>
        <div className={styles['header-left']}>
          <DatabaseOutlined style={{ fontSize: 24, marginRight: 12 }} />
          <h2>数据库探索</h2>
          <Text type="secondary">PostgreSQL</Text>
        </div>
      </div>

      <div className={styles['content']}>
        <Card className={styles['sidebar']}>
          {renderTableList()}
        </Card>

        <Card className={styles['main']}>
          <Tabs
            defaultActiveKey="data"
            items={[
              {
                key: 'data',
                label: (
                  <span>
                    <TableOutlined />
                    数据
                  </span>
                ),
                children: renderData(),
              },
              {
                key: 'schema',
                label: (
                  <span>
                    <DatabaseOutlined />
                    结构
                  </span>
                ),
                children: renderSchema(),
              },
              {
                key: 'sql',
                label: (
                  <span>
                    <CodeOutlined />
                    SQL
                  </span>
                ),
                children: renderSqlEditor(),
              },
            ]}
          />
        </Card>
      </div>
    </div>
  )
}
