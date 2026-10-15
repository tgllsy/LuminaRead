import { useState, useEffect, useCallback } from 'react'
import type { SelectionAnchorRect } from '../../reader-controls/types'
import { ENTITY_DICTIONARY } from '../helpers/entityMatcherHelpers'
import { copilotApi } from '../../copilot'

export interface EntityWikiTarget {
  term: string
  anchorRect?: SelectionAnchorRect | null
}

export function useEntityWikiState(bookId?: string) {
  const [target, setTarget] = useState<EntityWikiTarget | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiExplanation, setAiExplanation] = useState<string | null>(null)

  const openEntity = useCallback((term: string, anchorRect?: SelectionAnchorRect | null) => {
    setTarget({ term, anchorRect })
    setAiExplanation(null)
  }, [])

  const closeEntity = useCallback(() => {
    setTarget(null)
    setAiExplanation(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!target) return
    let isCancelled = false
    const term = target.term

    const fetchExplanation = async () => {
      setLoading(true)
      try {
        const res = await copilotApi.queryCopilot({
          mode: 'explain',
          selected_text: term,
          book_id: bookId || '',
        })
        if (!isCancelled && res.content) {
          setAiExplanation(res.content)
        }
      } catch {
        // 请求失败保留内置释义降级
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    fetchExplanation()
    return () => {
      isCancelled = true
    }
  }, [target, bookId])

  const quickDef = target ? ENTITY_DICTIONARY[target.term] || null : null

  return {
    target,
    quickDef,
    aiExplanation,
    loading,
    openEntity,
    closeEntity,
  }
}
