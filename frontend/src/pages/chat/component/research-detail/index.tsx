import { FileTextOutlined, ShareAltOutlined, BarChartOutlined, CloseOutlined } from '@ant-design/icons'
import { useState } from 'react'
import classNames from 'classnames'
import SearchResults from './search-results'
import KnowledgeGraph from './knowledge-graph'
import Visualization from './visualization'
import styles from './index.module.scss'

export interface SearchResult {
  id: string
  title: string
  source: string
  date?: string
  url?: string
  snippet?: string
}

export interface GraphNode {
  id: string
  name: string
  type: 'core' | 'tech' | 'company' | 'policy' | 'product' | 'person'
  size?: number
  importance?: number
}

export interface GraphEdge {
  source: string
  target: string
  relation: string
}

export interface KnowledgeGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  stats?: {
    entitiesCount: number
    relationsCount: number
  }
}

export interface ChartConfig {
  id: string
  title: string
  subtitle?: string
  type: 'line' | 'bar' | 'pie' | 'horizontal_bar' | 'radar'
  echarts_option: Record<string, unknown>
}

export interface ResearchDetailData {
  stepId: string
  stepType: string
  title: string
  subtitle?: string
  searchResults?: SearchResult[]
  knowledgeGraph?: KnowledgeGraphData
  charts?: ChartConfig[]
}

interface ResearchDetailProps {
  data: ResearchDetailData | null
  onClose?: () => void
}

type TabKey = 'results' | 'graph' | 'charts'

export default function ResearchDetail({ data, onClose }: ResearchDetailProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('results')

  if (!data) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <FileTextOutlined />
          </div>
          <div className={styles.emptyText}>点击左侧步骤查看详情</div>
        </div>
      </div>
    )
  }

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      key: 'results',
      label: '搜索结果',
      icon: <FileTextOutlined />,
      count: data.searchResults?.length,
    },
    {
      key: 'graph',
      label: '知识图谱',
      icon: <ShareAltOutlined />,
      count: data.knowledgeGraph?.nodes?.length,
    },
    {
      key: 'charts',
      label: '可视化图表',
      icon: <BarChartOutlined />,
      count: data.charts?.length,
    },
  ]

  return (
    <div className={styles.panel}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.stepType}>{data.subtitle || data.stepType}</span>
          <h2 className={styles.title}>{data.title}</h2>
        </div>
        {onClose && (
          <button className={styles.closeBtn} onClick={onClose}>
            <CloseOutlined />
          </button>
        )}
      </div>

      {/* Tab 切换 */}
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={classNames(styles.tab, { [styles.active]: activeTab === tab.key })}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={styles.count}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className={styles.content}>
        {activeTab === 'results' && <SearchResults data={data.searchResults} />}
        {activeTab === 'graph' && <KnowledgeGraph data={data.knowledgeGraph} />}
        {activeTab === 'charts' && <Visualization charts={data.charts} />}
      </div>
    </div>
  )
}
