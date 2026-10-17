import { useState, useRef, useEffect, useCallback } from 'react'
import { AmbientAudioEngine } from '../helpers/ambientAudioEngine'

const AMBIENT_STORAGE_KEY = 'luminaread_tts_ambient_mixer_v1'

interface SavedMixerState {
  rain: number
  fire: number
  wind: number
}

function loadSavedMixerState(): SavedMixerState {
  try {
    const raw = localStorage.getItem(AMBIENT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        rain: typeof parsed.rain === 'number' ? parsed.rain : 30,
        fire: typeof parsed.fire === 'number' ? parsed.fire : 0,
        wind: typeof parsed.wind === 'number' ? parsed.wind : 15,
      }
    }
  } catch {
    // fallback
  }
  return { rain: 30, fire: 0, wind: 15 }
}

function saveMixerState(state: SavedMixerState) {
  try {
    localStorage.setItem(AMBIENT_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore
  }
}

export function useMultiTrackAmbientMixer(isOpen: boolean) {
  const [initial] = useState(loadSavedMixerState)
  const [rainVol, setRainVol] = useState(initial.rain)
  const [fireVol, setFireVol] = useState(initial.fire)
  const [windVol, setWindVol] = useState(initial.wind)

  const engineRef = useRef<AmbientAudioEngine | null>(null)

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new AmbientAudioEngine()
    }
    return engineRef.current
  }, [])

  useEffect(() => {
    saveMixerState({ rain: rainVol, fire: fireVol, wind: windVol })
    if (!isOpen) {
      engineRef.current?.stopAll()
    }
  }, [isOpen, rainVol, fireVol, windVol])

  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  return {
    rainVol,
    fireVol,
    windVol,
    setRainVol,
    setFireVol,
    setWindVol,
    stopAll: () => engineRef.current?.stopAll(),
  }
}
