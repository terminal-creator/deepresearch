import { useState } from 'react'
import Markdown from '@/components/markdown'
import styles from './process-report.module.scss'

export interface SectionDraft {
  id: string
  title: string
  content: string
  wordCount?: number
}

interface ProcessReportProps {
  content?: string  // 最终报告
  sections?: SectionDraft[]  // 章节草稿
}

export default function ProcessReport({ content, sections }: ProcessReportProps) {
  const [activeView, setActiveView] = useState<'sections' | 'final'>('final')

  const hasSections = sections && sections.length > 0
  const hasContent = !!content

  if (!hasSections && !hasContent) {
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
    <div className={styles.container}>
      {/* 切换按钮 */}
      {(hasSections || hasContent) && (
        <div className={styles.viewSwitch}>
          <button
            className={`${styles.switchBtn} ${activeView === 'sections' ? styles.active : ''}`}
            onClick={() => setActiveView('sections')}
            disabled={!hasSections}
          >
            章节草稿 {hasSections && <span className={styles.count}>{sections.length}</span>}
          </button>
          <button
            className={`${styles.switchBtn} ${activeView === 'final' ? styles.active : ''}`}
            onClick={() => setActiveView('final')}
            disabled={!hasContent}
          >
            最终报告
          </button>
        </div>
      )}

      {/* 内容区 */}
      <div className={styles.contentArea}>
        {activeView === 'sections' && hasSections ? (
          <div className={styles.sectionsView}>
            {sections.map((section, index) => (
              <div key={section.id} className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIndex}>{index + 1}</span>
                  <span className={styles.sectionTitle}>{section.title}</span>
                  {section.wordCount && (
                    <span className={styles.wordCount}>{section.wordCount} 字</span>
                  )}
                </div>
                <div className={styles.sectionContent}>
                  <Markdown value={section.content} />
                </div>
              </div>
            ))}
          </div>
        ) : hasContent ? (
          <div className={styles.finalReport}>
            <Markdown value={content} />
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyText}>
              {activeView === 'sections' ? '暂无章节草稿' : '报告生成中...'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
