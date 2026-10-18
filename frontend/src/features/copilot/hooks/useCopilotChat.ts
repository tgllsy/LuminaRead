import { useState, useCallback, useRef, useEffect } from 'react'
import { copilotApi } from '../api'
import { cleanNoteContent } from '../helpers'
import type { CopilotChatMode, CopilotResponse, CopilotQueryPayload, ChatMessage, ChatHistoryItem } from '../types'

export function useCopilotChat(initialMode: CopilotChatMode = 'explain') {
  const [copilotMode, setCopilotMode] = useState<CopilotChatMode>(initialMode)
  const [customQuestion, setCustomQuestion] = useState('')
  const [lastUserQuestion, setLastUserQuestion] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotResponse, setCopilotResponse] = useState<CopilotResponse | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [savedNotice, setSavedNotice] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const chatCacheRef = useRef<Map<string, CopilotResponse>>(new Map())

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const cancelQuery = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setCopilotLoading(false)
    }
  }, [])

  const clearChatSession = useCallback(() => {
    setMessages([])
    setCopilotResponse(null)
    setLastUserQuestion('')
    setCustomQuestion('')
  }, [])

  const sendQuery = useCallback(async (payload: CopilotQueryPayload) => {
    const q = (payload.question || '').trim()
    const cleanSel = (payload.selected_text || '').trim()
    if (q) {
      setLastUserQuestion(q)
    }

    const cacheKey = `${payload.book_id}_${payload.chapter_index || 0}_${payload.mode}_${cleanSel}_${q}`
    if (!payload.force_new && chatCacheRef.current.has(cacheKey)) {
      const cached = chatCacheRef.current.get(cacheKey)!
      setCopilotResponse(cached)
      if (q) {
        setMessages((prev) => [
          ...prev,
          { id: `u_${Date.now()}`, role: 'user', content: q, timestamp: Date.now() },
          { id: `a_${Date.now() + 1}`, role: 'assistant', content: cached.content, title: cached.title, follow_ups: cached.follow_ups, timestamp: Date.now() + 1 },
        ])
      }
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    // 提取最近 4 条历史作为会话记忆发送给大模型
    const history: ChatHistoryItem[] = messages.slice(-4).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    if (q) {
      setMessages((prev) => [
        ...prev,
        { id: `u_${Date.now()}`, role: 'user', content: q, timestamp: Date.now() },
      ])
    }

    setCopilotLoading(true)
    try {
      const data = await copilotApi.queryCopilot({ ...payload, history }, controller.signal)
      if (controller.signal.aborted) return
      setCopilotResponse(data)
      chatCacheRef.current.set(cacheKey, data)
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: data.content,
          title: data.title,
          citations: data.citations,
          follow_ups: data.follow_ups,
          timestamp: Date.now(),
        },
      ])
    } catch (err: any) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return
      }
      console.warn('[useCopilotChat] Query failed:', err)
      const errResp: CopilotResponse = {
        title: 'AI 伴读与解析',
        content: `### 📖 章节核心导读与思考\n\n当前章节围绕《${payload.book_title || '正文'}》展开。\n\n**提问反馈**：“${q || '本段核心要点'}”\n\n> 💡 伴读提示：暂未连接到远程 AI 大模型服务或服务响应超时。建议检查网络状态，或尝试点击下方的延伸追问标签重试。`,
        follow_ups: ['📌 提炼本段核心论点', '💡 用通俗比喻解释', '❓ 本段推导是否严谨'],
        isError: true,
      }
      setCopilotResponse(errResp)
    } finally {
      if (abortControllerRef.current === controller) {
        setCopilotLoading(false)
        abortControllerRef.current = null
      }
    }
  }, [messages])

  const saveInsightNote = useCallback(
    (
      effectiveAnchorText: string,
      onSaveInsightAsNote: (text: string, noteContent: string) => void
    ) => {
      if (!copilotResponse?.content || copilotResponse.isError) return
      const cleaned = cleanNoteContent(copilotResponse.content)
      onSaveInsightAsNote(effectiveAnchorText, cleaned)
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 2000)
    },
    [copilotResponse]
  )

  return {
    copilotMode,
    setCopilotMode,
    customQuestion,
    setCustomQuestion,
    lastUserQuestion,
    copilotLoading,
    copilotResponse,
    messages,
    clearChatSession,
    savedNotice,
    sendQuery,
    cancelQuery,
    saveInsightNote,
  }
}
