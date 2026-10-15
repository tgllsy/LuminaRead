import { useEffect, useRef, type RefObject } from 'react'

export function useAudioKeepAlive(
  ttsPlaying: boolean,
  ttsPaused: boolean,
  audioElRef: RefObject<HTMLAudioElement | null>,
  audioCtxRef: RefObject<AudioContext | null>
) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const keepAliveCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let isCancelled = false
    const shouldKeepAlive = ttsPlaying && !ttsPaused

    if (shouldKeepAlive) {
      // 1. Maintain hardware audio session pipeline via Web Audio to prevent mobile background session drop
      if (!keepAliveCtxRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
          if (AudioContextClass) {
            const ctx = new AudioContextClass()
            const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
            const source = ctx.createBufferSource()
            source.buffer = buffer
            source.loop = true
            const gain = ctx.createGain()
            gain.gain.value = 0.00001
            source.connect(gain)
            gain.connect(ctx.destination)
            source.start(0)
            keepAliveCtxRef.current = ctx
          }
        } catch {
          // Web Audio not supported or restricted
        }
      } else if (keepAliveCtxRef.current.state === 'suspended') {
        keepAliveCtxRef.current.resume().catch(() => {})
      }

      // 2. Request screen wake lock for foreground reading
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        navigator.wakeLock.request('screen').then((lock) => {
          if (isCancelled) {
            lock.release?.().catch(() => {})
            return
          }
          wakeLockRef.current = lock
        }).catch(() => {})
      }
    } else {
      if (keepAliveCtxRef.current && keepAliveCtxRef.current.state === 'running') {
        keepAliveCtxRef.current.suspend().catch(() => {})
      }
      if (wakeLockRef.current) {
        wakeLockRef.current.release?.().catch(() => {})
        wakeLockRef.current = null
      }
    }

    const handleVisibility = () => {
      if (isCancelled || !shouldKeepAlive) return
      if ('wakeLock' in navigator && !wakeLockRef.current && document.visibilityState === 'visible') {
        navigator.wakeLock.request('screen').then((lock) => {
          if (isCancelled) {
            lock.release?.().catch(() => {})
            return
          }
          wakeLockRef.current = lock
        }).catch(() => {})
      }
      if (audioElRef.current?.src && audioElRef.current.paused && !audioElRef.current.ended) {
        audioElRef.current.play().catch(() => {})
      }
      if (keepAliveCtxRef.current?.state === 'suspended') {
        keepAliveCtxRef.current.resume().catch(() => {})
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('pageshow', handleVisibility)
    return () => {
      isCancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('pageshow', handleVisibility)
    }
  }, [ttsPlaying, ttsPaused, audioElRef, audioCtxRef])

  useEffect(() => {
    return () => {
      try {
        keepAliveCtxRef.current?.close()
      } catch {
        // ignore
      }
      keepAliveCtxRef.current = null
      wakeLockRef.current?.release?.().catch(() => {})
      wakeLockRef.current = null
    }
  }, [])
}
