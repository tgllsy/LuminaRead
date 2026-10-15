import { useState, useEffect, useCallback, useMemo } from 'react'
import { discoveryApi } from '../api'
import { DEFAULT_SELECTED_SOURCE_ID } from '../constants'
import { useSourceTest } from './useSourceTest'
import type { BookSourceConfig } from '../types'

export function useSourceSettings(enabled: boolean) {
  const [sources, setSources] = useState<BookSourceConfig[]>([])
  const [selectedId, setSelectedId] = useState(DEFAULT_SELECTED_SOURCE_ID)
  const [loading, setLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  const fetchSources = useCallback(async () => {
    setLoading(true)
    try {
      setSources(await discoveryApi.fetchSources())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) fetchSources()
  }, [enabled, fetchSources])

  const activeSource = useMemo(
    () => sources.find((s) => s.id === selectedId) || sources[0],
    [sources, selectedId]
  )

  const updateActiveField = useCallback((patch: Partial<BookSourceConfig>) => {
    if (!activeSource) return
    setSources((p) => p.map((s) => (s.id === activeSource.id ? { ...s, ...patch } : s)))
  }, [activeSource])

  const updateAuthField = useCallback((key: string, val: string) => {
    if (!activeSource) return
    updateActiveField({ auth_config: { ...activeSource.auth_config, [key]: val } })
  }, [activeSource, updateActiveField])

  const handleSave = useCallback(async () => {
    if (!activeSource) return
    setSaveMessage('正在保存配置...')
    try {
      await discoveryApi.updateSource(activeSource.id, {
        base_url: activeSource.base_url,
        mirror_urls: activeSource.mirror_urls,
        auth_config: activeSource.auth_config,
        proxy_url: activeSource.proxy_url,
        enabled: activeSource.enabled,
      })
      setSaveMessage('已保存并生效！')
      setTimeout(() => setSaveMessage(''), 2500)
    } catch {
      setSaveMessage('保存失败，请重试')
    }
  }, [activeSource])

  const onTestSuccess = useCallback((id: string, ms: number, st: string) => {
    setSources((p) => p.map((s) => (s.id === id ? { ...s, last_test_ms: ms, last_test_status: st } : s)))
  }, [])

  const { testingId, testFeedback, handleTestConnectivity } = useSourceTest(onTestSuccess)

  return {
    sources,
    selectedId,
    setSelectedId,
    activeSource,
    loading,
    saveMessage,
    updateActiveField,
    updateAuthField,
    handleSave,
    fetchSources,
    testingId,
    testFeedback,
    handleTestConnectivity,
  }
}
