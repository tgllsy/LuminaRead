import { useState, useRef, useEffect, useCallback } from 'react'
import type { NeuralVoiceOption, VoiceCategory } from '../types'
import { DEFAULT_VOICES } from '../constants'
import { DRAMA_VOICE_PRESETS } from '../constants/dramaVoices'
import { loadTtsPreferences, saveTtsPreferences } from '../helpers'
import { fetchVoicesApi } from '../api'

const ALL_INITIAL_VOICES: NeuralVoiceOption[] = [...DRAMA_VOICE_PRESETS, ...DEFAULT_VOICES]

export function useVoicesManager(isOpen: boolean) {
  const [voices, setVoices] = useState<NeuralVoiceOption[]>(ALL_INITIAL_VOICES)
  const [voiceCategory, setVoiceCategory] = useState<VoiceCategory>('recommended')
  const [serverCacheClips, setServerCacheClips] = useState<number>(0)

  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    const saved = loadTtsPreferences()
    if (saved.voice && ALL_INITIAL_VOICES.some((v) => v.id === saved.voice)) {
      return saved.voice
    }
    return 'zh-CN-XiaoxiaoNeural'
  })

  const [ttsRate, setTtsRate] = useState<number>(() => {
    const saved = loadTtsPreferences()
    if (typeof saved.rate === 'number' && saved.rate >= 0.5 && saved.rate <= 2.5) {
      return saved.rate
    }
    return 1.0
  })

  const selectedVoiceRef = useRef<string>(selectedVoice)
  selectedVoiceRef.current = selectedVoice
  const ttsRateRef = useRef<number>(ttsRate)
  ttsRateRef.current = ttsRate

  useEffect(() => {
    saveTtsPreferences(selectedVoice, ttsRate)
  }, [selectedVoice, ttsRate])

  const refreshVoiceStats = useCallback(async () => {
    try {
      const d = await fetchVoicesApi()
      if (Array.isArray(d.voices) && d.voices.length > 0) {
        const initialMap = new Map(ALL_INITIAL_VOICES.map((v) => [v.id, v]))
        const extras = d.voices.filter((v) => v && v.id && !initialMap.has(v.id))
        setVoices([...ALL_INITIAL_VOICES, ...extras])
      }
      if (d.cache_stats && typeof d.cache_stats.cached_clips === 'number') {
        setServerCacheClips(d.cache_stats.cached_clips)
      }
    } catch {
      // fallback to offline default voices
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      refreshVoiceStats()
    }
  }, [isOpen, refreshVoiceStats])

  return {
    voices,
    selectedVoice,
    setSelectedVoice,
    selectedVoiceRef,
    ttsRate,
    setTtsRate,
    ttsRateRef,
    voiceCategory,
    setVoiceCategory,
    serverCacheClips,
    setServerCacheClips,
  }
}
