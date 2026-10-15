import { useState, useRef, useEffect, useCallback } from 'react'
import type { SleepTimerMode } from '../types'

export function useSleepTimer(onTimeout: () => void) {
  const [sleepMode, setSleepMode] = useState<SleepTimerMode>('off')
  const [sleepRemainingSec, setSleepRemainingSec] = useState<number>(0)
  const sleepModeRef = useRef<SleepTimerMode>('off')
  sleepModeRef.current = sleepMode

  const handleSelectSleepMode = useCallback((mode: SleepTimerMode) => {
    setSleepMode(mode)
    sleepModeRef.current = mode
    if (mode === 'off' || mode === 'chapter_end') {
      setSleepRemainingSec(0)
    } else {
      setSleepRemainingSec(Number(mode) * 60)
    }
  }, [])

  const resetSleepTimer = useCallback(() => {
    setSleepMode('off')
    sleepModeRef.current = 'off'
    setSleepRemainingSec(0)
  }, [])

  useEffect(() => {
    if (sleepMode === 'off' || sleepMode === 'chapter_end' || sleepRemainingSec <= 0) {
      return
    }
    const timer = window.setInterval(() => {
      setSleepRemainingSec((prev) => {
        if (prev <= 1) {
          onTimeout()
          setSleepMode('off')
          sleepModeRef.current = 'off'
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [sleepMode, sleepRemainingSec, onTimeout])

  return {
    sleepMode,
    setSleepMode,
    sleepModeRef,
    sleepRemainingSec,
    handleSelectSleepMode,
    resetSleepTimer,
  }
}
