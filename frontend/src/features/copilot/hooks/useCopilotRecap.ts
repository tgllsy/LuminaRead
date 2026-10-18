import { useState, useCallback, useRef } from 'react'
import { copilotApi } from '../api'
import type { SpoilerFreeRecapData, CharacterNode } from '../types'

const recapCache = new Map<string, SpoilerFreeRecapData>()

export function useCopilotRecap() {
  const [recapData, setRecapData] = useState<SpoilerFreeRecapData | null>(null)
  const [recapLoading, setRecapLoading] = useState(false)
  const [recapError, setRecapError] = useState<string | null>(null)
  const [selectedChar, setSelectedChar] = useState<CharacterNode | null>(null)

  const loadRecap = useCallback(
    async (bookId: string, currentChapterIndex: number, currentPercentage = 0, force = false) => {
      const cacheKey = `${bookId}_${currentChapterIndex}`
      if (!force && recapCache.has(cacheKey)) {
        const cached = recapCache.get(cacheKey)!
        setRecapData(cached)
        if (cached.character_graph.nodes.length > 0) {
          setSelectedChar(cached.character_graph.nodes[0])
        }
        return
      }

      setRecapLoading(true)
      setRecapError(null)
      try {
        const data = await copilotApi.fetchRecap({
          mode: 'spoiler_free_recap',
          book_id: bookId,
          current_chapter_index: currentChapterIndex,
          current_percentage: currentPercentage,
        })
        const rawNodes = Array.isArray(data?.character_graph?.nodes) ? data.character_graph.nodes : []
        const normalizedNodes: CharacterNode[] = rawNodes.map((n, idx) => ({
          id: n.id || `char_${idx}`,
          name: n.name || '核心意象',
          role: n.role || '叙事要素',
          firstSeenChapter: typeof n.firstSeenChapter === 'number' ? n.firstSeenChapter : 0,
          traits: Array.isArray(n.traits) && n.traits.length > 0 ? n.traits : ['核心叙事节点'],
          statusUpToNow: n.statusUpToNow || '已在当前已读章节中出场并参与核心情节推进。',
          keyEvents: Array.isArray(n.keyEvents) && n.keyEvents.length > 0 ? n.keyEvents : ['第 1 章起持续参与叙事脉络演进'],
        }))
        const normalizedData: SpoilerFreeRecapData = {
          ...data,
          visible_chapters_count: data?.visible_chapters_count ?? 1,
          hidden_chapters_count: data?.hidden_chapters_count ?? 0,
          recap_points: Array.isArray(data?.recap_points) ? data.recap_points : [],
          character_graph: {
            nodes: normalizedNodes,
            edges: Array.isArray(data?.character_graph?.edges) ? data.character_graph.edges : [],
          },
        }
        recapCache.set(cacheKey, normalizedData)
        setRecapData(normalizedData)
        if (normalizedNodes.length > 0) {
          setSelectedChar(normalizedNodes[0])
        }
      } catch (err: any) {
        console.error('[useCopilotRecap] Failed to fetch recap:', err)
        setRecapError(err?.message || '获取前情提要失败，请检查网络或 AI 接口配置')
      } finally {
        setRecapLoading(false)
      }
    },
    []
  )

  return {
    recapData,
    recapLoading,
    recapError,
    selectedChar,
    setSelectedChar,
    loadRecap,
  }
}
