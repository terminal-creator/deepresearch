import { BarChartOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import styles from './visualization.module.scss'

interface ChartConfig {
  id: string
  title: string
  subtitle?: string
  type: 'line' | 'bar' | 'pie' | 'horizontal_bar' | 'radar'
  echarts_option: Record<string, unknown>
}

interface VisualizationProps {
  charts?: ChartConfig[]
}

export default function Visualization({ charts }: VisualizationProps) {
  if (!charts?.length) {
    return (
      <div className={styles.empty}>
        <BarChartOutlined className={styles.emptyIcon} />
        <span>暂无可视化图表</span>
      </div>
    )
  }

  return (
    <div className={styles.grid}>
      {charts.map((chart) => (
        <div key={chart.id} className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>{chart.title}</h3>
            {chart.subtitle && <p className={styles.cardSubtitle}>{chart.subtitle}</p>}
          </div>
          <div className={styles.chartContainer}>
            <ReactECharts
              option={chart.echarts_option}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
