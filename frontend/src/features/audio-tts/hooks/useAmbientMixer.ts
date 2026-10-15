import { useState, useRef, useEffect, useCallback } from 'react'
import type { AmbientPreset } from '../types'
import { createProceduralNoiseBuffer, getAmbientFilterCutoff } from '../helpers'

export function useAmbientMixer(initialPreset: AmbientPreset = 'off', initialVolume = 0.35) {
  const [ambientPreset, setAmbientPreset] = useState<AmbientPreset>(initialPreset)
  const [ambientVolume, setAmbientVolume] = useState<number>(initialVolume)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)

  const stopAmbientAudio = useCallback(() => {
    try {
      sourceNodeRef.current?.stop()
      audioCtxRef.current?.close()
    } catch {
      // ignore
    }
    sourceNodeRef.current = null
    audioCtxRef.current = null
    gainNodeRef.current = null
  }, [])

  const startAmbientAudio = useCallback((preset: AmbientPreset, vol: number) => {
    stopAmbientAudio()
    if (preset === 'off') return
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new AudioCtx()
      audioCtxRef.current = ctx
      const buffer = createProceduralNoiseBuffer(ctx, preset)
      const noiseSource = ctx.createBufferSource()
      noiseSource.buffer = buffer
      noiseSource.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = getAmbientFilterCutoff(preset)

      const gainNode = ctx.createGain()
      gainNode.gain.value = vol * 0.3

      noiseSource.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(ctx.destination)
      noiseSource.start()

      sourceNodeRef.current = noiseSource
      gainNodeRef.current = gainNode
    } catch {
      // AudioContext blocked or unsupported in headless environment
    }
  }, [stopAmbientAudio])

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = ambientVolume * 0.3
    }
  }, [ambientVolume])

  useEffect(() => {
    return () => stopAmbientAudio()
  }, [stopAmbientAudio])

  return {
    ambientPreset,
    ambientVolume,
    setAmbientPreset,
    setAmbientVolume,
    startAmbientAudio,
    stopAmbientAudio,
    audioCtxRef,
  }
}
