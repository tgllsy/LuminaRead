import { useState, useCallback, useRef, useEffect } from 'react'
import { copilotApi } from '../api'
import { cleanNoteContent } from '../helpers'
import type { CopilotChatMode, CopilotResponse, CopilotQueryPayload } from '../types'

export function useCopilotChat(initialMode: CopilotChatMode = 'explain') {
  const [copilotMode, setCopilotMode] = useState<CopilotChatMode>(initialMode)
  const [customQuestion, setCustomQuestion] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const [copilotResponse, setCopilotResponse] = useState<CopilotResponse | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

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

  const sendQuery = useCallback(async (payload: CopilotQueryPayload) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setCopilotLoading(true)
    try {
      const data = await copilotApi.queryCopilot(payload, controller.signal)
      if (controller.signal.aborted) return
      setCopilotResponse(data)
    } catch (err: any) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        return
      }
      console.warn('[useCopilotChat] Query failed:', err)
      setCopilotResponse({
        title: 'AI 伴读与解析',
        content: `### 📖 章节核心导读与思考\n\n当前章节围绕《${payload.book_title || '正文'}》展开。\n\n**提问反馈**：“${payload.question || '本段核心要点'}”\n\n> 💡 伴读提示：暂未连接到远程 AI 大模型服务或服务响应超时。建议检查网络状态，或尝试点击下方的延伸追问标签重试。`,
        follow_ups: ['📌 提炼本段核心论点', '💡 用通俗比喻解释', '❓ 本段推导是否严谨'],
        isError: true,
      })
    } finally {
      if (abortControllerRef.current === controller) {
        setCopilotLoading(false)
        abortControllerRef.current = null
      }
    }
  }, [])

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
    copilotLoading,
    copilotResponse,
    savedNotice,
    sendQuery,
    cancelQuery,
    saveInsightNote,
  }
}
