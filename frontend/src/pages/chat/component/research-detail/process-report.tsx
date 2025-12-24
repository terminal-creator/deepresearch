import Markdown from '@/components/markdown'
import styles from './index.module.scss'

interface ProcessReportProps {
  content?: string
}

export default function ProcessReport({ content }: ProcessReportProps) {
  if (!content) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className={styles.emptyText}>写作阶段开始后将在此显示报告内容</div>
      </div>
    )
  }

  return (
    <div className={styles.processReport}>
      <Markdown value={content} />
    </div>
  )
}
