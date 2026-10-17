import { useState, useRef, useEffect, useCallback } from 'react'
import type { AmbientPreset } from '../types'
import { AmbientAudioEngine } from '../helpers/ambientAudioEngine'

const AMBIENT_STORAGE_KEY = 'luminaread_ambient_prefs_v2'

interface SavedAmbientState {
  preset: AmbientPreset
  volume: number
  rain: number
  fire: number
  wind: number
}

function loadSavedAmbientState(initialPreset: AmbientPreset, initialVolume: number): SavedAmbientState {
  try {
    const raw = localStorage.getItem(AMBIENT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        preset: parsed.preset || initialPreset,
        volume: typeof parsed.volume === 'number' ? parsed.volume : initialVolume,
        rain: typeof parsed.rain === 'number' ? parsed.rain : 30,
        fire: typeof parsed.fire === 'number' ? parsed.fire : 0,
        wind: typeof parsed.wind === 'number' ? parsed.wind : 15,
      }
    }
  } catch {}
  return {
    preset: initialPreset,
    volume: initialVolume,
    rain: initialPreset === 'rain' ? 60 : 30,
    fire: initialPreset === 'fire' ? 60 : 0,
    wind: initialPreset === 'wind' ? 60 : 15,
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
  const [ambientEnabled, setAmbientEnabledState] = useState<boolean>(false)
  const [ambientPreset, setAmbientPresetState] = useState<AmbientPreset>(initial.preset)
  const [ambientVolume, setAmbientVolumeState] = useState<number>(initial.volume)
  const [rainVol, setRainVolState] = useState<number>(initial.rain)
  const [fireVol, setFireVolState] = useState<number>(initial.fire)
  const [windVol, setWindVolState] = useState<number>(initial.wind)

  const volumesRef = useRef({
    rain: initial.rain,
    fire: initial.fire,
    wind: initial.wind,
  })
  const engineRef = useRef<AmbientAudioEngine | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const getOrCreateEngine = useCallback((): AmbientAudioEngine => {
    if (!engineRef.current) {
      engineRef.current = new AmbientAudioEngine()
      engineRef.current.setMasterVolume(ambientVolume)
      engineRef.current.setEnabled(ambientEnabled)
    }
    return engineRef.current
  }, [ambientVolume, ambientEnabled])

  const stopAmbientAudio = useCallback(() => {
    setAmbientEnabledState(false)
    engineRef.current?.setEnabled(false)
    engineRef.current?.stopAll()
    setAmbientPresetState('off')
    volumesRef.current = { rain: 0, fire: 0, wind: 0 }
    setRainVolState(0)
    setFireVolState(0)
    setWindVolState(0)
    saveAmbientState({
      preset: 'off',
      volume: ambientVolume,
      rain: 0,
      fire: 0,
      wind: 0,
    })
  }, [ambientVolume])

  const setAmbientEnabled = useCallback((enabled: boolean) => {
    setAmbientEnabledState(enabled)
    const engine = getOrCreateEngine()
    engine.setEnabled(enabled)

    if (enabled) {
      if (ambientPreset === 'off' && rainVol === 0 && fireVol === 0 && windVol === 0) {
        setAmbientPresetState('rain')
        setRainVolState(60)
        volumesRef.current.rain = 60
        engine.playPreset('rain', ambientVolume)
      }
    } else {
      engine.stopAll()
    }
  }, [ambientPreset, ambientVolume, fireVol, getOrCreateEngine, rainVol, windVol])

  const toggleAmbientEnabled = useCallback(() => {
    setAmbientEnabled(!ambientEnabled)
  }, [ambientEnabled, setAmbientEnabled])

  const startAmbientAudio = useCallback(
    (preset: AmbientPreset, vol = ambientVolume) => {
      const engine = getOrCreateEngine()
      if (preset === 'off') {
        stopAmbientAudio()
        return
      }

      setAmbientEnabledState(true)
      engine.setEnabled(true)
      setAmbientPresetState(preset)
      setAmbientVolumeState(vol)
      engine.playPreset(preset, vol)

      if (preset === 'rain') {
        volumesRef.current = { rain: 70, fire: 0, wind: 0 }
        setRainVolState(70)
        setFireVolState(0)
        setWindVolState(0)
      } else if (preset === 'fire') {
        volumesRef.current = { rain: 0, fire: 70, wind: 0 }
        setRainVolState(0)
        setFireVolState(70)
        setWindVolState(0)
      } else if (preset === 'wind') {
        volumesRef.current = { rain: 0, fire: 0, wind: 70 }
        setRainVolState(0)
        setFireVolState(0)
        setWindVolState(70)
      }

      saveAmbientState({
        preset,
        volume: vol,
        rain: volumesRef.current.rain,
        fire: volumesRef.current.fire,
        wind: volumesRef.current.wind,
      })
    },
    [ambientVolume, getOrCreateEngine]
  )

  const setAmbientVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol))
    setAmbientVolumeState(clamped)
    engineRef.current?.setMasterVolume(clamped)
  }, [])

  const applyMultiTrackUpdate = useCallback(
    (nextRain: number, nextFire: number, nextWind: number) => {
      volumesRef.current = { rain: nextRain, fire: nextFire, wind: nextWind }
      setRainVolState(nextRain)
      setFireVolState(nextFire)
      setWindVolState(nextWind)

      const hasSound = nextRain > 0 || nextFire > 0 || nextWind > 0
      const engine = getOrCreateEngine()

      if (hasSound) {
        setAmbientEnabledState(true)
        engine.setEnabled(true)
        engine.setMultiTrackVolumes({
          rain: nextRain,
          fire: nextFire,
          wind: nextWind,
        }, true)

        if (nextRain > 0 && nextFire === 0 && nextWind === 0) {
          setAmbientPresetState('rain')
        } else if (nextFire > 0 && nextRain === 0 && nextWind === 0) {
          setAmbientPresetState('fire')
        } else if (nextWind > 0 && nextRain === 0 && nextFire === 0) {
          setAmbientPresetState('wind')
        } else {
          setAmbientPresetState('rain')
        }
      } else {
        setAmbientEnabledState(false)
        engine.setEnabled(false)
        engine.stopAll()
        setAmbientPresetState('off')
      }

      saveAmbientState({
        preset: hasSound ? 'rain' : 'off',
        volume: ambientVolume,
        rain: nextRain,
        fire: nextFire,
        wind: nextWind,
      })
    },
    [ambientVolume, getOrCreateEngine]
  )

  const setRainVol = useCallback((val: number) => {
    applyMultiTrackUpdate(val, volumesRef.current.fire, volumesRef.current.wind)
  }, [applyMultiTrackUpdate])

  const setFireVol = useCallback((val: number) => {
    applyMultiTrackUpdate(volumesRef.current.rain, val, volumesRef.current.wind)
  }, [applyMultiTrackUpdate])

  const setWindVol = useCallback((val: number) => {
    applyMultiTrackUpdate(volumesRef.current.rain, volumesRef.current.fire, val)
  }, [applyMultiTrackUpdate])

  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  const isAmbientActive =
    ambientEnabled && (ambientPreset !== 'off' || rainVol > 0 || fireVol > 0 || windVol > 0)

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
