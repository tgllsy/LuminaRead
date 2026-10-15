import { useState, useCallback } from 'react'
import { discoveryApi } from '../api'
import type { ExternalBookResult, DownloadItemState } from '../types'

interface UseBookDownloadOptions {
  onBookDownloaded: (bookId: string, openImmediately?: boolean) => void
  onMarkInShelf: (remoteId: string, localBookId: string) => void
}

export function useBookDownload({
  onBookDownloaded,
  onMarkInShelf,
}: UseBookDownloadOptions) {
  const [downloadingMap, setDownloadingMap] = useState<
    Record<string, DownloadItemState>
  >({})

  const handleOneClickDownload = useCallback(
    async (item: ExternalBookResult) => {
      const key = item.remote_id
      setDownloadingMap((prev) => ({
        ...prev,
        [key]: { status: '连接书源...', progress: 22 },
      }))

      setTimeout(() => {
        setDownloadingMap((prev) =>
          prev[key]?.progress === 100
            ? prev
            : { ...prev, [key]: { status: '解析目录入库...', progress: 72 } }
        )
      }, 180)

      try {
        const data = await discoveryApi.downloadBook(item)
        if (data?.book?.id) {
          const bookId = data.book.id
          setDownloadingMap((prev) => ({
            ...prev,
            [key]: { status: '已入库', progress: 100, localBookId: bookId },
          }))
          onMarkInShelf(key, bookId)
          onBookDownloaded(bookId, false)
        }
      } catch {
        setDownloadingMap((prev) => ({
          ...prev,
          [key]: { status: '下载重试', progress: 0 },
        }))
      }
    },
    [onBookDownloaded, onMarkInShelf]
  )

  return { downloadingMap, handleOneClickDownload }
}
