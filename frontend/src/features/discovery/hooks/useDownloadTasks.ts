import { useState, useEffect, useCallback, useRef } from 'react'
import { discoveryApi } from '../api'
import type { DownloadTask } from '../types'

export function useDownloadTasks(autoPoll = false, intervalMs = 3000) {
  const [tasks, setTasks] = useState<DownloadTask[]>([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const refreshTasks = useCallback(async () => {
    setLoading(true)
    try {
      const list = await discoveryApi.fetchDownloadTasks()
      setTasks(list)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!autoPoll) return
    refreshTasks()
    timerRef.current = setInterval(refreshTasks, intervalMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoPoll, intervalMs, refreshTasks])

  return { tasks, loading, refreshTasks }
}
