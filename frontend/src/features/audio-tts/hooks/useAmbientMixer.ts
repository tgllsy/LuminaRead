import { useState, useRef, useEffect, useCallback } from 'react'
import type { AmbientPreset } from '../types'
import { AmbientAudioEngine } from '../helpers/ambientAudioEngine'

const AMBIENT_STORAGE_KEY = 'luminaread_ambient_prefs_v3'

interface SavedAmbientState {
  preset: AmbientPreset
  volume: number
  enabled: boolean
}

function loadSavedAmbientState(initialPreset: AmbientPreset, initialVolume: number): SavedAmbientState {
  try {
    const raw = localStorage.getItem(AMBIENT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        preset: parsed.preset || initialPreset,
        volume: typeof parsed.volume === 'number' ? parsed.volume : initialVolume,
        enabled: Boolean(parsed.enabled),
      }
    }
  } catch {}
  return {
    preset: initialPreset,
    volume: initialVolume,
    enabled: false,
  }
}

function saveAmbientState(state: SavedAmbientState) {
  try {
    localStorage.setItem(AMBIENT_STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function useAmbientMixer(
  initialPreset: AmbientPreset = 'off',
  initialVolume = 0.5
) {
  const [initial] = useState(() => loadSavedAmbientState(initialPreset, initialVolume))
  const [ambientEnabled, setAmbientEnabledState] = useState<boolean>(initial.enabled)
  const [ambientPreset, setAmbientPresetState] = useState<AmbientPreset>(initial.preset)
  const [ambientVolume, setAmbientVolumeState] = useState<number>(initial.volume)

  const volumeRef = useRef(ambientVolume)
  volumeRef.current = ambientVolume
  const presetRef = useRef(ambientPreset)
  presetRef.current = ambientPreset
  const enabledRef = useRef(ambientEnabled)
  enabledRef.current = ambientEnabled

  const engineRef = useRef<AmbientAudioEngine | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const getOrCreateEngine = useCallback((): AmbientAudioEngine => {
    if (!engineRef.current) {
      engineRef.current = new AmbientAudioEngine()
      engineRef.current.setMasterVolume(volumeRef.current)
      engineRef.current.setEnabled(enabledRef.current)
    }
    return engineRef.current
  }, [])

  const stopAmbientAudio = useCallback(() => {
    setAmbientEnabledState(false)
    enabledRef.current = false
    const engine = engineRef.current
    if (engine) {
      engine.setEnabled(false)
      engine.stopAll()
    }
    setAmbientPresetState('off')
    presetRef.current = 'off'
    saveAmbientState({
      preset: 'off',
      volume: volumeRef.current,
      enabled: false,
    })
  }, [])

  const startAmbientAudio = useCallback(
    (preset: AmbientPreset, vol?: number) => {
      const targetVol = vol !== undefined ? vol : volumeRef.current
      const engine = getOrCreateEngine()
      if (preset === 'off') {
        stopAmbientAudio()
        return
      }

      setAmbientEnabledState(true)
      enabledRef.current = true
      engine.setEnabled(true)
      setAmbientPresetState(preset)
      presetRef.current = preset
      setAmbientVolumeState(targetVol)
      volumeRef.current = targetVol
      engine.playPreset(preset, targetVol)

      saveAmbientState({
        preset,
        volume: targetVol,
        enabled: true,
      })
    },
    [getOrCreateEngine, stopAmbientAudio]
  )

  const setAmbientVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol))
    setAmbientVolumeState(clamped)
    volumeRef.current = clamped
    engineRef.current?.setMasterVolume(clamped)
    saveAmbientState({
      preset: presetRef.current,
      volume: clamped,
      enabled: enabledRef.current,
    })
  }, [])

  const setAmbientEnabled = useCallback(
    (enabled: boolean) => {
      setAmbientEnabledState(enabled)
      enabledRef.current = enabled
      const engine = getOrCreateEngine()
      engine.setEnabled(enabled)

      if (enabled) {
        const curPreset = presetRef.current
        const targetPreset = curPreset !== 'off' ? curPreset : 'rain'
        setAmbientPresetState(targetPreset)
        presetRef.current = targetPreset
        engine.playPreset(targetPreset, volumeRef.current)
      } else {
        engine.stopAll()
      }

      saveAmbientState({
        preset: presetRef.current,
        volume: volumeRef.current,
        enabled,
      })
    },
    [getOrCreateEngine]
  )

  const toggleAmbientEnabled = useCallback(() => {
    setAmbientEnabled(!enabledRef.current)
  }, [setAmbientEnabled])

  // 兼容遗留组件引用的 dummy/映射方法
  const setRainVol = useCallback((val: number) => {
    if (val > 0) startAmbientAudio('rain', val / 100)
    else if (presetRef.current === 'rain') stopAmbientAudio()
  }, [startAmbientAudio, stopAmbientAudio])

  const setFireVol = useCallback((val: number) => {
    if (val > 0) startAmbientAudio('fire', val / 100)
    else if (presetRef.current === 'fire') stopAmbientAudio()
  }, [startAmbientAudio, stopAmbientAudio])

  const setWindVol = useCallback((val: number) => {
    if (val > 0) startAmbientAudio('wind', val / 100)
    else if (presetRef.current === 'wind') stopAmbientAudio()
  }, [startAmbientAudio, stopAmbientAudio])

  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  const isAmbientActive = ambientEnabled && ambientPreset !== 'off'
  const rainVol = ambientPreset === 'rain' && isAmbientActive ? Math.round(ambientVolume * 100) : 0
  const fireVol = ambientPreset === 'fire' && isAmbientActive ? Math.round(ambientVolume * 100) : 0
  const windVol = ambientPreset === 'wind' && isAmbientActive ? Math.round(ambientVolume * 100) : 0

  return {
    ambientEnabled,
    setAmbientEnabled,
    toggleAmbientEnabled,
    ambientPreset,
    ambientVolume,
    rainVol,
    fireVol,
    windVol,
    isAmbientActive,
    setAmbientPreset: startAmbientAudio,
    setAmbientVolume,
    setRainVol,
    setFireVol,
    setWindVol,
    startAmbientAudio,
    stopAmbientAudio,
    audioCtxRef,
  }
}

