import * as api from '@/api'
import ComPageLayout from '@/components/page-layout'
import ComSender, { AttachmentInfo } from '@/components/sender'
import { ChatRole, ChatType } from '@/configs'
import { deviceActions, deviceState } from '@/store/device'
import { usePageTransport } from '@/utils'
import { useUnmount } from 'ahooks'
import { uniqueId } from 'lodash-es'
import { message } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { proxy, useSnapshot } from 'valtio'
import ChatMessage from './component/chat-message'
import Drawer from './component/drawer'
import Source from './component/source'
import StepDetailPanel, { StepDetailData } from './component/step-detail-panel'
import ResearchDetail, { ResearchDetailData, ResearchStep } from './component/research-detail'
import styles from './index.module.scss'
import { createChatId, createChatIdText, transportToChatEnter } from './shared'

async function scrollToBottom() {
  await new Promise((resolve) => setTimeout(resolve))

  const threshold = 200
  const distanceToBottom =
    document.documentElement.scrollHeight -
    document.documentElement.scrollTop -
    document.documentElement.clientHeight

  if (distanceToBottom <= threshold) {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    })
  }
}

export default function Index() {
  const { id } = useParams()
  const { data: ctx } = usePageTransport(transportToChatEnter)

  const [currentChatItem, setCurrentChatItem] = useState<API.ChatItem | null>(
    null,
  )

  // 步骤详情状态 (旧版)
  const [selectedStepDetail, setSelectedStepDetail] = useState<StepDetailData | null>(null)
  const stepDetailsRef = useRef<Map<string, StepDetailData>>(new Map())

  // 研究过程状态 (新版)
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([])
  const researchStepsRef = useRef<ResearchStep[]>([])  // 保持最新引用，供事件处理器使用
  const [selectedResearchDetail, setSelectedResearchDetail] = useState<ResearchDetailData | null>(null)
  const researchDetailsRef = useRef<Map<string, ResearchDetailData>>(new Map())

  // 同步 researchSteps 到 ref
  useEffect(() => {
    researchStepsRef.current = researchSteps
  }, [researchSteps])

  // 附件状态管理
  const [attachments, setAttachments] = useState<AttachmentInfo[]>([])
  const attachmentPollingRef = useRef<NodeJS.Timeout | null>(null)

  const [chat] = useState(() => {
    return proxy({
      list: [] as API.ChatItem[],
    })
  })
  const { list } = useSnapshot(chat) as {
    list: API.ChatItem[]
  }

  const loading = useMemo(() => {
    return list.some((o) => o.loading)
  }, [list])
  const loadingRef = useRef(loading)
  loadingRef.current = loading
  useEffect(() => {
    deviceActions.setChatting(loading)
  }, [loading])
  useUnmount(() => {
    deviceActions.setChatting(false)
    // 清理轮询
    if (attachmentPollingRef.current) {
      clearInterval(attachmentPollingRef.current)
    }
  })

  // 轮询检查附件处理状态
  useEffect(() => {
    const pendingAttachments = attachments.filter(
      att => att.status === 'pending' || att.status === 'processing'
    )

    if (pendingAttachments.length > 0 && !attachmentPollingRef.current) {
      attachmentPollingRef.current = setInterval(async () => {
        for (const att of pendingAttachments) {
          try {
            const res = await api.session.getAttachment(att.id)
            if (res.data) {
              setAttachments(prev =>
                prev.map(a =>
                  a.id === att.id ? { ...a, status: res.data.status } : a
                )
              )
            }
          } catch (e) {
            console.error('Failed to check attachment status', e)
          }
        }
      }, 2000)
    } else if (pendingAttachments.length === 0 && attachmentPollingRef.current) {
      clearInterval(attachmentPollingRef.current)
      attachmentPollingRef.current = null
    }

    return () => {
      if (attachmentPollingRef.current) {
        clearInterval(attachmentPollingRef.current)
        attachmentPollingRef.current = null
      }
    }
  }, [attachments])

  // 上传附件
  const handleUploadAttachment = useCallback(async (file: File) => {
    if (!id) {
      message.error('请先创建会话')
      return null
    }

    // 添加临时附件
    const tempId = uniqueId('temp-attachment-')
    setAttachments(prev => [
      ...prev,
      { id: tempId, filename: file.name, status: 'uploading' }
    ])

    try {
      const res = await api.session.uploadAttachment(id, file)
      if (res.data) {
        // 替换临时附件为真实附件
        setAttachments(prev =>
          prev.map(a =>
            a.id === tempId
              ? { id: res.data.id, filename: res.data.filename, status: res.data.status }
              : a
          )
        )
        message.success(`附件 ${file.name} 上传成功`)
        return res.data
      }
    } catch (e: any) {
      message.error(`附件上传失败: ${e.message || '未知错误'}`)
      // 移除失败的附件
      setAttachments(prev => prev.filter(a => a.id !== tempId))
    }
    return null
  }, [id])

  // 移除附件
  const handleRemoveAttachment = useCallback(async (attachmentId: string) => {
    try {
      // 只有非临时 ID 才需要调用删除 API
      if (!attachmentId.startsWith('temp-')) {
        await api.session.deleteAttachment(attachmentId)
      }
      setAttachments(prev => prev.filter(a => a.id !== attachmentId))
    } catch (e) {
      console.error('Failed to delete attachment', e)
    }
  }, [])

  const sendChat = useCallback(
    async (target: API.ChatItem, message: string, attachmentIds?: string[]) => {
      setCurrentChatItem(target)
      target.loading = true
      try {
        let res
        if (target.type === ChatType.Deepsearch) {
          res = await api.session.deepsearch({
            query: message,
          })
        } else if (attachmentIds && attachmentIds.length > 0) {
          // 使用带附件的聊天接口
          res = await api.session.chatWithAttachments({
            session_id: id!,
            question: message,
            attachment_ids: attachmentIds,
          })
        } else {
          res = await api.session.chat({
            session_id: id!,
            question: message,
          })
        }

        const reader = res.data.getReader()
        if (!reader) return

        await read(reader)
      } catch (error) {
        throw error
      } finally {
        target.loading = false
      }

      async function read(reader: ReadableStreamDefaultReader<any>) {
        let temp = ''
        const decoder = new TextDecoder('utf-8')
        while (true) {
          const { value, done } = await reader.read()
          temp += decoder.decode(value)

          while (true) {
            const index = temp.indexOf('\n')
            if (index === -1) break

            const slice = temp.slice(0, index)
            temp = temp.slice(index + 1)

            if (slice.startsWith('data: ')) {
              parseData(slice)
              scrollToBottom()
            }
          }

          if (done) {
            console.debug('数据接受完毕', temp)
            target.loading = false
            break
          }
        }
      }

      function parseData(slice: string) {
        try {
          const str = slice
            .trim()
            .replace(/^data\: /, '')
            .trim()
          if (str === '[DONE]') {
            return
          }

          const json = JSON.parse(str)
          if (target.type === ChatType.Deepsearch) {
            // 辅助函数：从 V2 格式中提取实际内容
            const extractContent = (data: any): string => {
              if (typeof data === 'string') return data
              if (typeof data === 'object' && data !== null) {
                // V2 格式: content 是对象 { agent, content: "实际内容" }
                if (typeof data.content === 'string') return data.content
                // 如果 content 也是对象，尝试 JSON 格式化
                return JSON.stringify(data, null, 2)
              }
              return String(data || '')
            }

            // V2 研究开始事件
            if (json.type === 'research_start') {
              target.reactMode = true
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              target.reactSteps.push({
                step: 0,
                type: 'plan',
                content: `🔬 开始深度研究: ${json.query || ''}`,
                timestamp: Date.now(),
              })
              // 重置研究步骤
              setResearchSteps([])
              researchDetailsRef.current.clear()
              setSelectedResearchDetail(null)
            }

            // V2 研究步骤事件 (新增)
            if (json.type === 'research_step') {
              const content = json.content || json
              const stepId = content.step_id || `step_${Date.now()}`
              const stepType = content.step_type as ResearchStep['type']

              // 转换 stats 从 snake_case 到 camelCase
              const rawStats = content.stats || {}
              const stats = {
                resultsCount: rawStats.results_count,
                chartsCount: rawStats.charts_count,
                entitiesCount: rawStats.entities_count,
                sectionsCount: rawStats.sections_count,
                wordCount: rawStats.word_count,
                questionsCount: rawStats.questions_count,
                sourcesCount: rawStats.sources_count,
                referencesCount: rawStats.references_count,
              }

              setResearchSteps(prev => {
                const existing = prev.find(s => s.type === stepType)
                let newSteps: ResearchStep[]
                if (existing) {
                  // 更新现有步骤
                  newSteps = prev.map(s => s.type === stepType ? {
                    ...s,
                    id: stepId,
                    status: content.status,
                    stats,
                  } : s)
                } else {
                  // 添加新步骤
                  newSteps = [...prev, {
                    id: stepId,
                    type: stepType,
                    title: content.title || stepType,
                    subtitle: content.subtitle || '',
                    status: content.status || 'running',
                    stats,
                  }]
                }
                // 同步更新 ref，确保后续事件能立即访问
                researchStepsRef.current = newSteps
                return newSteps
              })

              // 初始化详情数据
              if (!researchDetailsRef.current.has(stepId)) {
                const newDetail: ResearchDetailData = {
                  stepId,
                  stepType,
                  title: content.title || stepType,
                  subtitle: content.subtitle,
                  searchResults: [],
                  charts: [],
                }
                researchDetailsRef.current.set(stepId, newDetail)
                // 自动选中新的步骤详情（特别是 searching 步骤）
                if (stepType === 'searching' || content.status === 'running') {
                  setSelectedResearchDetail({ ...newDetail })
                }
              }
            }

            // V2 搜索结果事件 (详情面板用)
            if (json.type === 'search_results') {
              const content = json.content || json
              const results = content.results || []
              const isIncremental = content.isIncremental || false
              // 找到最近的 searching 步骤（使用 ref 获取最新状态）
              const currentSteps = researchStepsRef.current
              const searchingStep = currentSteps.find(s => s.type === 'searching')
              if (searchingStep) {
                const detail = researchDetailsRef.current.get(searchingStep.id)
                if (detail) {
                  const newResults = results.map((r: any, i: number) => ({
                    id: r.id || `sr_${Date.now()}_${i}`,
                    title: r.title,
                    source: r.source,
                    date: r.date,
                    url: r.url,
                    snippet: r.snippet,
                  }))
                  // 增量模式：累加结果；否则替换
                  if (isIncremental && detail.searchResults) {
                    detail.searchResults = [...detail.searchResults, ...newResults]
                  } else {
                    detail.searchResults = newResults
                  }
                  // 更新步骤统计
                  setResearchSteps(prev => prev.map(s =>
                    s.id === searchingStep.id
                      ? { ...s, stats: { ...s.stats, resultsCount: detail.searchResults?.length || 0 } }
                      : s
                  ))
                  // 自动选中
                  setSelectedResearchDetail({ ...detail })
                }
              }
            }

            // V2 知识图谱事件
            if (json.type === 'knowledge_graph') {
              const content = json.content || json
              const graph = content.graph || content
              // 找到最近的 analyzing 步骤或 searching 步骤（使用 ref）
              const currentSteps = researchStepsRef.current
              const targetStep = currentSteps.find(s => s.type === 'analyzing') || currentSteps.find(s => s.type === 'searching')
              if (targetStep) {
                const detail = researchDetailsRef.current.get(targetStep.id)
                if (detail) {
                  detail.knowledgeGraph = {
                    nodes: graph.nodes || [],
                    edges: graph.edges || [],
                    stats: content.stats || graph.stats,
                  }
                  setSelectedResearchDetail({ ...detail })
                }
              }
            }

            // V2 图表事件
            if (json.type === 'charts') {
              const content = json.content || json
              const charts = content.charts || []
              // 找到 analyzing 步骤（使用 ref）
              const currentSteps = researchStepsRef.current
              const analyzingStep = currentSteps.find(s => s.type === 'analyzing')
              if (analyzingStep) {
                const detail = researchDetailsRef.current.get(analyzingStep.id)
                if (detail) {
                  detail.charts = charts
                  // 更新步骤统计
                  setResearchSteps(prev => prev.map(s =>
                    s.id === analyzingStep.id
                      ? { ...s, stats: { ...s.stats, chartsCount: charts.length } }
                      : s
                  ))
                  setSelectedResearchDetail({ ...detail })
                }
              }
              // 同时保存到 target.charts 供报告使用
              if (!target.charts) {
                target.charts = []
              }
              target.charts.push(...charts)
            }

            // V2 阶段切换事件
            if (json.type === 'phase') {
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              const phaseLabels: Record<string, string> = {
                planning: '📋 规划阶段',
                researching: '🔍 搜索阶段',
                analyzing: '📊 分析阶段',
                writing: '✍️ 写作阶段',
                reviewing: '🔎 审核阶段',
                re_researching: '🔄 补充搜索',
                rewriting: '📝 重写阶段',
                revising: '📝 修订阶段',
              }
              target.reactSteps.push({
                step: target.reactSteps.length + 1,
                type: 'thought',
                content: `${phaseLabels[json.phase] || json.phase}: ${extractContent(json.content)}`,
                timestamp: Date.now(),
              })

              // 同时更新研究步骤条 - 映射 phase 到 step_type
              const phaseToStepType: Record<string, ResearchStep['type']> = {
                writing: 'writing',
                reviewing: 'reviewing',
                re_researching: 're_researching',
                rewriting: 'revising',
                revising: 'revising',
              }
              const stepType = phaseToStepType[json.phase]
              if (stepType) {
                const stepId = `step_${json.phase}_${Date.now()}`
                setResearchSteps(prev => {
                  const existing = prev.find(s => s.type === stepType)
                  if (!existing) {
                    const newSteps = [...prev, {
                      id: stepId,
                      type: stepType,
                      title: phaseLabels[json.phase] || json.phase,
                      subtitle: extractContent(json.content) || '',
                      status: 'running' as const,
                    }]
                    researchStepsRef.current = newSteps
                    return newSteps
                  }
                  return prev
                })
              }
            }

            // V2 大纲事件
            if (json.type === 'outline') {
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              const outlineContent = json.content || json
              const outline = outlineContent.outline || []
              const questions = outlineContent.research_questions || []

              let content = '**研究大纲**\n\n'
              if (outline.length > 0) {
                content += outline.map((sec: any, i: number) =>
                  `${i + 1}. **${sec.title}**\n   ${sec.description || ''}`
                ).join('\n\n')
              }
              if (questions.length > 0) {
                content += '\n\n**核心问题**\n' + questions.map((q: string) => `• ${q}`).join('\n')
              }

              target.reactSteps.push({
                step: target.reactSteps.length + 1,
                type: 'plan',
                content,
                timestamp: Date.now(),
              })
            }

            // V2 研究完成事件
            if (json.type === 'research_complete') {
              console.log('研究完成事件:', json)
              // 设置最终报告为内容
              if (json.final_report) {
                target.content = json.final_report
                console.log('设置报告内容，长度:', json.final_report.length)

                // 同时存储到研究详情中供"过程报告"tab显示
                const currentSteps = researchStepsRef.current
                const writingStep = currentSteps.find(s => s.type === 'writing' || s.type === 'generating')
                if (writingStep) {
                  const detail = researchDetailsRef.current.get(writingStep.id)
                  if (detail) {
                    detail.streamingReport = json.final_report
                    setSelectedResearchDetail({ ...detail })
                  }
                }
              }
              // 设置引用
              if (json.references && json.references.length > 0) {
                target.reference = json.references.map((ref: any, i: number) => ({
                  id: i + 1,
                  title: ref.title || ref.source_name || '来源',
                  link: ref.url || ref.source_url || '',
                  content: ref.content || ref.summary || '',
                  source: ref.source_type === 'local' ? 'knowledge' : 'web',
                }))
              }

              // 标记所有研究步骤为完成
              setResearchSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })))
            }

            // 检测 ReAct 模式
            if (json.mode === 'react' || json.mode === 'optimized' || json.type === 'react_start') {
              target.reactMode = true
            }

            // 研究计划事件 (V1)
            if (json.type === 'plan' && json.understanding) {
              target.researchPlan = {
                understanding: json.understanding || '',
                strategy: json.strategy || '',
                subQueries: (json.sub_queries || []).map((sq: any) => ({
                  query: sq.query,
                  purpose: sq.purpose,
                  tool: sq.tool,
                })),
                expectedAspects: json.expected_aspects || [],
              }
              // 同时添加到 reactSteps 用于展示
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              target.reactSteps.push({
                step: 0,
                type: 'plan',
                content: `**研究计划**\n\n理解: ${json.understanding}\n\n策略: ${json.strategy}\n\n子查询:\n${(json.sub_queries || []).map((sq: any) => `• ${sq.query} (${sq.purpose})`).join('\n')}`,
                timestamp: Date.now(),
              })
            }

            // ReAct 事件处理 (兼容 V1 和 V2)
            if (json.type === 'thought') {
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              target.reactSteps.push({
                step: json.step || target.reactSteps.length + 1,
                type: 'thought',
                content: extractContent(json.content),
                timestamp: Date.now(),
              })
            } else if (json.type === 'action') {
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              // V2 格式的 action
              const actionContent = json.content || json
              const tool = actionContent.tool || json.tool
              const isParallel = tool === 'parallel_search'
              const queries = actionContent.queries || json.params?.queries || []
              const section = actionContent.section || ''

              let displayContent = ''
              if (isParallel) {
                displayContent = `并行搜索${section ? ` (${section})` : ''} ${queries.length} 个查询:\n${queries.map((q: string) => `• ${q}`).join('\n')}`
              } else {
                displayContent = `调用工具: ${tool}${section ? ` - ${section}` : ''}`
              }

              target.reactSteps.push({
                step: json.step || target.reactSteps.length + 1,
                type: 'action',
                content: displayContent,
                tool: tool,
                params: json.params || actionContent,
                queries: isParallel ? queries : undefined,
                timestamp: Date.now(),
              })
            } else if (json.type === 'observation') {
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              // V2 格式的 observation
              const obsContent = json.content || json
              let displayContent = ''

              if (typeof obsContent === 'object') {
                const parts = []
                if (obsContent.section) parts.push(`📑 ${obsContent.section}`)
                if (obsContent.facts_count) parts.push(`事实: ${obsContent.facts_count} 条`)
                if (obsContent.data_points_count) parts.push(`数据点: ${obsContent.data_points_count} 个`)
                if (obsContent.duplicates_removed) parts.push(`去重: ${obsContent.duplicates_removed} 条`)
                if (obsContent.insights && obsContent.insights.length > 0) {
                  parts.push(`洞察:\n${obsContent.insights.map((i: string) => `  • ${i}`).join('\n')}`)
                }
                if (obsContent.source_quality) parts.push(`来源质量: ${obsContent.source_quality}`)
                displayContent = parts.join('\n') || JSON.stringify(obsContent, null, 2)
              } else {
                displayContent = typeof json.result === 'string' ? json.result : JSON.stringify(json.result || obsContent)
              }

              const stepId = `obs_${Date.now()}_${target.reactSteps.length}`
              target.reactSteps.push({
                step: json.step || target.reactSteps.length + 1,
                type: 'observation',
                content: displayContent,
                tool: json.tool,
                queries: json.queries_executed,
                success: json.success !== false,
                timestamp: Date.now(),
                stepId, // 添加 stepId 用于关联详情
              })

              // 存储步骤详情用于右侧面板展示
              if (typeof obsContent === 'object') {
                const stepDetail: StepDetailData = {
                  stepId,
                  type: obsContent.agent || 'observation',
                  section: obsContent.section,
                  searchResults: obsContent.search_results,
                  extractedFacts: obsContent.extracted_facts,
                  dataPoints: obsContent.data_points,
                  insights: obsContent.insights,
                }
                stepDetailsRef.current.set(stepId, stepDetail)
                // 自动选中最新的步骤详情
                setSelectedStepDetail(stepDetail)
              }
            } else if (json.type === 'section_draft') {
              // V2 章节撰写完成事件
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              const content = json.content || json
              target.reactSteps.push({
                step: target.reactSteps.length + 1,
                type: 'observation',
                content: `✍️ 章节「${content.section_title || '未知'}」撰写完成\n字数: ${content.word_count || 0}\n要点: ${(content.key_points || []).join('、')}`,
                timestamp: Date.now(),
              })
            } else if (json.type === 'report_draft') {
              // V2 报告草稿完成事件
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              const content = json.content || json
              target.reactSteps.push({
                step: target.reactSteps.length + 1,
                type: 'observation',
                content: `📝 研究报告撰写完成\n字数: ${content.word_count || 0}\n引用数: ${content.references_count || 0}`,
                timestamp: Date.now(),
              })

              // 标记写作步骤完成
              setResearchSteps(prev => prev.map(s =>
                s.type === 'writing' || s.type === 'generating'
                  ? { ...s, status: 'completed' as const }
                  : s
              ))
            } else if (json.type === 'review') {
              // V2 审核反馈事件
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              const content = json.content || json
              const score = content.quality_score || 0
              const passed = content.passed || content.verdict === 'pass' || score >= 7
              target.reactSteps.push({
                step: target.reactSteps.length + 1,
                type: 'thought',
                content: `🔍 审核结果: 质量评分 ${score}/10\n${passed ? '✅ 审核通过' : '⚠️ 需要修订'}`,
                timestamp: Date.now(),
              })

              // 更新审核步骤状态
              setResearchSteps(prev => prev.map(s =>
                s.type === 'reviewing'
                  ? { ...s, status: passed ? 'completed' as const : 'running' as const }
                  : s
              ))
            } else if (json.type === 'revision_complete') {
              // V2 修订完成事件
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              const content = json.content || json
              target.reactSteps.push({
                step: target.reactSteps.length + 1,
                type: 'observation',
                content: `📝 修订完成，共 ${content.changes_count || 0} 处修改`,
                timestamp: Date.now(),
              })
            } else if (json.type === 'error') {
              // V2 错误事件
              if (!target.reactSteps) {
                target.reactSteps = []
              }
              target.reactSteps.push({
                step: target.reactSteps.length + 1,
                type: 'thought',
                content: `❌ 错误: ${extractContent(json.content)}`,
                timestamp: Date.now(),
              })
            } else if (json.type === 'chart') {
              if (!target.charts) {
                target.charts = []
              }
              target.charts.push({
                type: json.chart_type || json.type,
                title: json.title || '数据图表',
                echarts_option: json.echarts_option,
                data: json.data,
              })
            } else if (json.type === 'data_insight') {
              if (!target.insights) {
                target.insights = []
              }
              target.insights.push(...(json.insights || []))
            } else if (['status', 'search_results', 'thinking_step'].includes(json.type)) {
              // 兼容原有状态事件
              if (!target.thinks) {
                target.thinks = []
              }

              const lastThink = target.thinks[target.thinks.length - 1]

              if (lastThink?.type === json.type) {
                lastThink.results!.push({
                  id: uniqueId('think_result'),
                  content: json.subquery || json.content,
                  count: json.count,
                })
              } else {
                target.thinks.push({
                  id: uniqueId('think_result'),
                  type: json.type as 'status' | 'search_results',
                  results: [
                    {
                      id: uniqueId('think_result'),
                      content: json.subquery || json.content,
                      count: json.count,
                    },
                  ],
                })
              }
            } else if (json.type === 'search_result_item') {
              if (!target.search_results) {
                target.search_results = []
              }

              try {
                target.search_results.push({
                  ...json.result,
                  id: uniqueId('search-results'),
                  host: json.result?.url ? new URL(json.result.url).host : '',
                })
              } catch (e) {
                console.debug('Parse URL error', e)
              }
            } else if (json.type === 'thinking') {
              target.think = `${target.think || ''}${json.content || ''}`
            } else if (['answer', 'final_answer'].includes(json.type)) {
              target.content = `${target.content}${json.content || ''}`
            } else if (json.type === 'reference_materials') {
              target.reference = json.content?.map((o: any) => ({
                id: o.reference_id,
                title: o.name,
                link: o.url,
                content: o.summary,
                source: o.source === 'local' ? 'knowledge' : 'web',
              }))
            }
          } else {
            if (json?.content) {
              if (json.thinking) {
                target.think = `${target.think || ''}${json.content || ''}`
              } else {
                target.content = `${target.content || ''}${json.content || ''}`
              }
            }

            if (json?.documents?.length) {
              target.reference = json.documents
            }

            if (json?.image_results) {
              target.image_results = json.image_results
            }
          }
        } catch {
          console.debug('解析失败')
          console.debug(slice)
        }
      }
    },
    [chat],
  )

  const send = useCallback(
    async (message: string, attachmentIds?: string[]) => {
      if (loadingRef.current) return
      if (!message && (!attachmentIds || attachmentIds.length === 0)) return

      chat.list.push({
        id: createChatId(),
        role: ChatRole.User,
        type: ChatType.Normal,
        content: message || '(附件问答)',
      })

      chat.list.push({
        id: createChatId(),
        role: ChatRole.Assistant,
        type: deviceState.useDeepsearch ? ChatType.Deepsearch : ChatType.Normal,
        content: '',
      })
      scrollToBottom()

      const target = chat.list[chat.list.length - 1]

      await sendChat(target, message || '请分析附件内容', attachmentIds)

      // 发送后清空附件列表
      if (attachmentIds && attachmentIds.length > 0) {
        setAttachments([])
      }
    },
    [chat, sendChat],
  )
  const hasSentInitialMessage = useRef(false)
  useEffect(() => {
    if (ctx?.data?.message && !hasSentInitialMessage.current) {
      hasSentInitialMessage.current = true
      send(ctx.data.message)
    }
  }, [ctx, send])

  useEffect(() => {
    const handleScroll = () => {
      const anchors: {
        id: string
        top: number
        item: API.ChatItem
      }[] = []

      chat.list
        .filter((o) => o.type === ChatType.Deepsearch)
        .forEach((item, index) => {
          const id = createChatIdText(item.id)
          const dom = document.getElementById(id)
          if (!dom) return

          const top = dom.offsetTop
          if (index === 0 || top < window.scrollY) {
            anchors.push({ id, top, item })
          }
        })

      if (anchors.length) {
        const current = anchors.reduce((prev, curr) =>
          curr.top > prev.top ? curr : prev,
        )

        setCurrentChatItem(current.item)
      }
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 处理步骤点击，切换显示详情 (旧版)
  const handleStepClick = useCallback((stepId: string) => {
    const detail = stepDetailsRef.current.get(stepId)
    if (detail) {
      setSelectedStepDetail(detail)
    }
  }, [])

  // 处理研究步骤点击 (新版)
  const handleResearchStepClick = useCallback((stepId: string) => {
    const detail = researchDetailsRef.current.get(stepId)
    if (detail) {
      setSelectedResearchDetail(detail)
    }
  }, [])

  // 判断是否在深度研究模式（只要是 Deepsearch 类型就启用宽布局）
  const isDeepResearchMode = currentChatItem?.type === ChatType.Deepsearch

  // 确定右侧面板显示内容
  const rightPanelContent = useMemo(() => {
    // 新版: 深度研究模式，显示研究详情面板
    if (isDeepResearchMode) {
      return (
        <ResearchDetail
          data={selectedResearchDetail}
          steps={researchSteps}
          onStepClick={handleResearchStepClick}
          onClose={() => setSelectedResearchDetail(null)}
        />
      )
    }
    // 旧版: 如果当前在深度搜索模式且有步骤详情，显示旧的步骤详情面板
    if (currentChatItem?.type === ChatType.Deepsearch && (selectedStepDetail || currentChatItem?.reactSteps?.length)) {
      return <StepDetailPanel detail={selectedStepDetail} />
    }
    // 否则显示搜索来源
    if (currentChatItem?.search_results?.length) {
      return (
        <Drawer title="搜索来源">
          <Source list={currentChatItem.search_results} />
        </Drawer>
      )
    }
    return null
  }, [currentChatItem, selectedStepDetail, isDeepResearchMode, selectedResearchDetail, researchSteps, handleResearchStepClick])

  return (
    <ComPageLayout
      sender={
        <>
          <ComSender
            loading={loading}
            attachments={attachments}
            onSend={send}
            onUploadAttachment={handleUploadAttachment}
            onRemoveAttachment={handleRemoveAttachment}
          />
        </>
      }
      right={rightPanelContent}
      wideRight={isDeepResearchMode}
    >
      <div className={styles['chat-page']}>
        <ChatMessage list={list} onSend={send} onStepClick={handleStepClick} />
      </div>
    </ComPageLayout>
  )
}
