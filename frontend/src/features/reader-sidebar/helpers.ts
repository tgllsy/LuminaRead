import type { TocItem, HighlightItem, MindmapLayout, MindmapNode } from './types'
import {
  DEFAULT_LEAF_SPACING,
  MIN_BLOCK_HEIGHT,
  MIN_MINDMAP_HEIGHT,
} from './constants'

export function filterToc(toc: TocItem[], filter: string): TocItem[] {
  const query = filter.trim().toLowerCase()
  if (!query) return toc
  return toc.filter((ch) => ch.title.toLowerCase().includes(query))
}

export function filterHighlights(
  highlights: HighlightItem[],
  colorFilter: string,
  chapterFilter: number | 'all'
): HighlightItem[] {
  return highlights.filter((h) => {
    if (colorFilter !== 'all' && h.color !== colorFilter) return false
    if (chapterFilter !== 'all' && h.chapter_index !== chapterFilter) return false
    return true
  })
}

export function computeMindmapLayout(
  toc: TocItem[],
  filteredHighlights: HighlightItem[]
): MindmapLayout {
  let currentYCursor = 45
  // 仅保留真正包含笔记的章节，杜绝无笔记空目录污染导图
  const chaptersWithNotes = toc.filter((ch) =>
    filteredHighlights.some((h) => h.chapter_index === ch.index)
  )

  const nodes: MindmapNode[] = chaptersWithNotes.map((ch) => {
    const chHighlights = filteredHighlights.filter((h) => h.chapter_index === ch.index)
    const blockHeight = Math.max(
      MIN_BLOCK_HEIGHT,
      chHighlights.length * (DEFAULT_LEAF_SPACING + 16) + 24
    )
    const cy = currentYCursor + Math.round(blockHeight / 2) - 20
    const leaves = chHighlights.map((hl, hIdx) => {
      const hy =
        chHighlights.length === 1
          ? cy + 2
          : currentYCursor + hIdx * (DEFAULT_LEAF_SPACING + 16) + 6
      return { hl, hy }
    })
    currentYCursor += blockHeight + 22
    return { ch, cy, leaves }
  })

  const totalHeight = Math.max(MIN_MINDMAP_HEIGHT, currentYCursor + 40)
  const rootY = Math.max(60, Math.round(totalHeight / 2) - 26)

  return { nodes, totalHeight, rootY }
}

export function triggerMarkdownDownload(markdown: string, filename: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
