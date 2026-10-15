import type { BookSourceConfig } from './types'

export function getSourceBadge(sourceType: string): string {
  switch (sourceType) {
    case 'zlibrary':
      return 'Z-Library'
    case 'annas_archive':
      return "Anna's Archive"
    case 'openlibrary':
      return 'OpenLibrary'
    case 'gutenberg':
      return 'Gutendex 公版'
    case 'opds':
      return 'OPDS 书源'
    default:
      return '全网聚合'
  }
}

export function formatFileSize(size: string | undefined): string {
  if (!size) return '未知大小'
  return size.trim()
}

export function sortSourcesByAvailability(sources: BookSourceConfig[]): BookSourceConfig[] {
  return [...sources].sort((a, b) => {
    if (a.enabled !== b.enabled) {
      return a.enabled ? -1 : 1
    }
    const latencyA = a.last_test_ms || 9999
    const latencyB = b.last_test_ms || 9999
    if (latencyA !== latencyB) {
      return latencyA - latencyB
    }
    return (a.priority || 0) - (b.priority || 0)
  })
}

export function getSourceStatusText(source: BookSourceConfig): string {
  if (!source.enabled) return '已停用'
  if (source.last_test_ms) return `${source.last_test_ms}ms`
  return '就绪'
}

export function isBookDownloaded(
  alreadyInShelf?: boolean,
  progress?: number
): boolean {
  return Boolean(alreadyInShelf || progress === 100)
}
