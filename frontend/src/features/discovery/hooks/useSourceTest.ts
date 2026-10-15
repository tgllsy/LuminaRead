import { useState, useCallback } from 'react'
import { discoveryApi } from '../api'
import type { BookSourceConfig } from '../types'

export function useSourceTest(
  onTestSuccess: (id: string, latencyMs: number, status: string) => void
) {
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testFeedback, setTestFeedback] = useState<Record<string, string>>({})

  const handleTestConnectivity = useCallback(
    async (src: BookSourceConfig) => {
      setTestingId(src.id)
      try {
        const res = await discoveryApi.testSourceConnectivity({
          source_id: src.id,
          base_url: src.base_url,
          proxy_url: src.proxy_url,
        })
        setTestFeedback((p) => ({
          ...p,
          [src.id]: `${res.message} (${res.latency_ms}ms)`,
        }))
        onTestSuccess(src.id, res.latency_ms, res.status)
      } finally {
        setTestingId(null)
      }
    },
    [onTestSuccess]
  )

  return { testingId, testFeedback, handleTestConnectivity }
}
