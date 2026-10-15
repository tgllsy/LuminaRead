import React from 'react'
import type { SleepTimerMode } from '../types'
import { SLEEP_TIMER_OPTIONS } from '../constants'

interface TimerPickerModalProps {
  sleepMode: SleepTimerMode
  onSelectSleepMode: (mode: SleepTimerMode) => void
  pillIdleCls: string
  accentActivePillCls: string
}

export const TimerPickerModal: React.FC<TimerPickerModalProps> = ({
  sleepMode,
  onSelectSleepMode,
  pillIdleCls,
  accentActivePillCls,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 pb-2">
      {SLEEP_TIMER_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelectSleepMode(opt.id)}
          className={`py-2.5 rounded-2xl text-xs transition-all ${
            sleepMode === opt.id ? accentActivePillCls : pillIdleCls
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
