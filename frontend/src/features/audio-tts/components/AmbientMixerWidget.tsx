import React from 'react'
import { Sliders, CloudRain, Flame, Wind, Sparkles, VolumeX } from 'lucide-react'

interface AmbientMixerWidgetProps {
  rainVol: number
  fireVol: number
  windVol: number
  onChangeRain: (val: number) => void
  onChangeFire: (val: number) => void
  onChangeWind: (val: number) => void
  onOpenMoreSounds?: () => void
  ambientEnabled?: boolean
  onToggleEnabled?: () => void
}

export const AmbientMixerWidget: React.FC<AmbientMixerWidgetProps> = ({
  rainVol,
  fireVol,
  windVol,
  onChangeRain,
  onChangeFire,
  onChangeWind,
  onOpenMoreSounds,
  ambientEnabled = false,
  onToggleEnabled,
}) => {
  const activeCount = (rainVol > 0 ? 1 : 0) + (fireVol > 0 ? 1 : 0) + (windVol > 0 ? 1 : 0)
  const isPlaying = ambientEnabled && activeCount > 0

  const handleMuteAll = () => {
    onChangeRain(0)
    onChangeFire(0)
    onChangeWind(0)
  }

  return (
    <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3 select-none">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-200 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>白噪音伴读混音器</span>
        </span>
        <div className="flex items-center gap-2">
          {onToggleEnabled && (
            <button
              type="button"
              onClick={onToggleEnabled}
              className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors ${
                isPlaying
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/10 text-slate-400 hover:text-white'
              }`}
              title={isPlaying ? '点击关闭白噪音' : '点击开启白噪音'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>{isPlaying ? '已开启' : '已关闭'}</span>
            </button>
          )}
          {isPlaying && (
            <button
              type="button"
              onClick={handleMuteAll}
              className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
              title="全部静音"
            >
              <VolumeX className="w-3 h-3" />
              <span>静音</span>
            </button>
          )}
          {onOpenMoreSounds && (
            <button
              type="button"
              onClick={onOpenMoreSounds}
              className="text-[10px] text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>音效库</span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2.5 pt-1 text-[11px]">
        {/* Rain */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChangeRain(rainVol > 0 ? 0 : 60)}
            className="text-slate-400 hover:text-sky-300 flex items-center gap-1.5 w-20 text-left cursor-pointer transition-colors"
            title="点击开关雨声"
          >
            <CloudRain className={`w-3.5 h-3.5 ${rainVol > 0 ? 'text-sky-400' : 'text-slate-500'}`} />
            <span className={rainVol > 0 ? 'text-slate-200 font-medium' : ''}>窗外细雨</span>
          </button>
          <input
            type="range"
            value={rainVol}
            min={0}
            max={100}
            step={1}
            onChange={(e) => onChangeRain(Number(e.target.value))}
            className="flex-1 accent-[#1b88ee] h-1.5 bg-white/20 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-slate-300 w-8 text-right">{rainVol}%</span>
        </div>

        {/* Fireplace */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChangeFire(fireVol > 0 ? 0 : 60)}
            className="text-slate-400 hover:text-amber-300 flex items-center gap-1.5 w-20 text-left cursor-pointer transition-colors"
            title="点击开关壁炉声"
          >
            <Flame className={`w-3.5 h-3.5 ${fireVol > 0 ? 'text-amber-500' : 'text-slate-500'}`} />
            <span className={fireVol > 0 ? 'text-slate-200 font-medium' : ''}>冬日壁炉</span>
          </button>
          <input
            type="range"
            value={fireVol}
            min={0}
            max={100}
            step={1}
            onChange={(e) => onChangeFire(Number(e.target.value))}
            className="flex-1 accent-amber-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-slate-300 w-8 text-right">{fireVol}%</span>
        </div>

        {/* Wind */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onChangeWind(windVol > 0 ? 0 : 60)}
            className="text-slate-400 hover:text-teal-300 flex items-center gap-1.5 w-20 text-left cursor-pointer transition-colors"
            title="点击开关松风声"
          >
            <Wind className={`w-3.5 h-3.5 ${windVol > 0 ? 'text-teal-400' : 'text-slate-500'}`} />
            <span className={windVol > 0 ? 'text-slate-200 font-medium' : ''}>山谷松风</span>
          </button>
          <input
            type="range"
            value={windVol}
            min={0}
            max={100}
            step={1}
            onChange={(e) => onChangeWind(Number(e.target.value))}
            className="flex-1 accent-teal-500 h-1.5 bg-white/20 rounded-lg cursor-pointer"
          />
          <span className="font-mono text-slate-300 w-8 text-right">{windVol}%</span>
        </div>
      </div>
    </div>
  )
}
