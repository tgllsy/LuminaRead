import React from 'react'
import { SPEED_PRESETS } from '../constants'

interface SpeedPickerModalProps {
  ttsRate: number
  onSelectRate: (rate: number) => void
  pillIdleCls: string
  accentActivePillCls: string
}

export const SpeedPickerModal: React.FC<SpeedPickerModalProps> = ({
  ttsRate,
  onSelectRate,
  pillIdleCls,
  accentActivePillCls,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2 pb-2">
      {SPEED_PRESETS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onSelectRate(r)}
          className={`py-2.5 rounded-2xl font-mono text-xs transition-all ${
            Math.abs(ttsRate - r) < 0.04 ? accentActivePillCls : pillIdleCls
          }`}
        >
          {r}x {r === 1.0 ? '标准' : ''}
        </button>
      ))}
    </div>
  )
}
