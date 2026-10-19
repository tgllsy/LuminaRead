import React from 'react'
import { Sun, Moon, Check } from 'lucide-react'
import { BRIGHTNESS_BOUNDS } from '../constants'
import type { ThemeColorPickerTabProps } from '../types'

interface ReadingThemeItem {
  id: string
  label: string
  previewBg: string
  textColor: string
  borderColor: string
  patch: {
    theme: 'light' | 'sepia_green' | 'parchment' | 'dark' | 'eink'
    bgTexture: 'plain' | 'paper' | 'grain' | 'dune' | 'moonlight'
    eInkMode: boolean
  }
  isMatch: (theme: string, bgTexture: string) => boolean
}

const READING_THEMES: ReadingThemeItem[] = [
  {
    id: 'light',
    label: '纸白',
    previewBg: 'bg-white',
    textColor: 'text-slate-900',
    borderColor: 'border-slate-300',
    patch: { theme: 'light', bgTexture: 'plain', eInkMode: false },
    isMatch: (t, bg) => t === 'light' && (bg === 'plain' || !bg),
  },
  {
    id: 'parchment',
    label: '羊皮纸',
    previewBg: 'bg-[#f4ede1]',
    textColor: 'text-[#382b1e]',
    borderColor: 'border-[#dfceb5]',
    patch: { theme: 'parchment', bgTexture: 'plain', eInkMode: false },
    isMatch: (t) => t === 'parchment',
  },
  {
    id: 'sepia_green',
    label: '豆沙绿',
    previewBg: 'bg-[#dcecd2]',
    textColor: 'text-[#1b2e1b]',
    borderColor: 'border-[#b9d6ab]',
    patch: { theme: 'sepia_green', bgTexture: 'plain', eInkMode: false },
    isMatch: (t) => t === 'sepia_green',
  },
  {
    id: 'paper',
    label: '宣纸',
    previewBg: 'bg-[#f5f4f0]',
    textColor: 'text-[#2c2620]',
    borderColor: 'border-[#dedad0]',
    patch: { theme: 'light', bgTexture: 'paper', eInkMode: false },
    isMatch: (t, bg) => t === 'light' && bg === 'paper',
  },
  {
    id: 'moonlight',
    label: '静谧月夜',
    previewBg: 'bg-gradient-to-br from-[#d5e8f6] via-[#e2f0f9] to-[#eef6fc]',
    textColor: 'text-[#1a2e40]',
    borderColor: 'border-[#b9d4e8]',
    patch: { theme: 'light', bgTexture: 'moonlight', eInkMode: false },
    isMatch: (t, bg) => t === 'light' && bg === 'moonlight',
  },
  {
    id: 'eink',
    label: '墨水屏',
    previewBg: 'bg-white',
    textColor: 'text-black',
    borderColor: 'border-black',
    patch: { theme: 'eink', bgTexture: 'plain', eInkMode: true },
    isMatch: (t) => t === 'eink',
  },
  {
    id: 'dark',
    label: '深邃暗夜',
    previewBg: 'bg-[#090a0f]',
    textColor: 'text-slate-100',
    borderColor: 'border-slate-800',
    patch: { theme: 'dark', bgTexture: 'plain', eInkMode: false },
    isMatch: (t) => t === 'dark',
  },
]

export const ThemeColorPickerTab: React.FC<ThemeColorPickerTabProps> = ({
  isDark,
  theme,
  bgTexture,
  brClamped,
  brRatio,
  onChange,
}) => (
  <div className="space-y-4 pb-2">
    <BrightnessSlider isDark={isDark} brClamped={brClamped} brRatio={brRatio} onChange={onChange} />
    <ThemeCardsGrid currentTheme={theme} currentBgTexture={bgTexture} onChange={onChange} />
  </div>
)

const ThemeCardsGrid: React.FC<{
  currentTheme: string
  currentBgTexture: string
  onChange: (patch: any) => void
}> = ({ currentTheme, currentBgTexture, onChange }) => (
  <div>
    <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
      <span>阅读主题</span>
      <span className="text-[11px] opacity-75">一键应用底色与排版对比</span>
    </div>
    <div className="grid grid-cols-4 gap-2.5">
      {READING_THEMES.map((item) => {
        const selected = item.isMatch(currentTheme, currentBgTexture)
        const isEink = item.id === 'eink'
        const isDarkTheme = item.id === 'dark'

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.patch)}
            className={`group flex flex-col items-center gap-1.5 p-1.5 rounded-2xl transition-all select-none ${
              selected
                ? 'ring-2 ring-[#1b88ee] bg-[#1b88ee]/8 shadow-xs'
                : 'hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <div
              className={`w-full h-11 rounded-xl ${item.previewBg} ${item.borderColor} border flex items-center justify-center relative shadow-2xs transition-transform group-hover:scale-[1.03]`}
            >
              {isDarkTheme ? (
                <Moon className="w-4 h-4 text-amber-300 fill-amber-300/80" />
              ) : isEink ? (
                <span className="text-[10px] font-mono font-bold text-black border border-black px-1 rounded-sm">
                  INK
                </span>
              ) : (
                <span className={`text-xs font-serif font-bold ${item.textColor}`}>
                  文
                </span>
              )}

              {selected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1b88ee] text-white flex items-center justify-center shadow-xs">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>
            <span
              className={`text-[11px] font-medium leading-none truncate max-w-full ${
                selected ? 'text-[#1b88ee] font-semibold' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  </div>
)

const BrightnessSlider: React.FC<
  Pick<ThemeColorPickerTabProps, 'isDark' | 'brClamped' | 'brRatio' | 'onChange'>
> = ({ isDark, brClamped, brRatio, onChange }) => (
  <div
    className={`h-11 rounded-full px-3.5 flex items-center gap-2.5 relative select-none ${
      isDark ? 'bg-slate-800' : 'bg-[#eff0f2]'
    }`}
  >
    <Sun className="w-4 h-4 text-amber-500 shrink-0 pointer-events-none" />
    <div className="flex-1 relative h-full flex items-center">
      <div className={`w-full h-1.5 rounded-full overflow-hidden pointer-events-none ${isDark ? 'bg-slate-700' : 'bg-slate-300/80'}`}>
        <div
          style={{ width: `${brRatio * 100}%` }}
          className="h-full rounded-full bg-[#1b88ee]"
        />
      </div>
      <input
        type="range"
        min={BRIGHTNESS_BOUNDS.min}
        max={BRIGHTNESS_BOUNDS.max}
        step={BRIGHTNESS_BOUNDS.step}
        value={brClamped}
        onChange={(e) => onChange({ brightness: Number(e.target.value) })}
        aria-label="页面亮度调节"
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30 m-0"
      />
      <div
        style={{ left: `calc(${brRatio * 100}% - ${brRatio * 34}px)` }}
        className={`absolute top-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.2)] border flex items-center justify-center text-[10px] font-mono font-bold pointer-events-none z-20 ${
          isDark ? 'bg-slate-700 border-slate-500 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {brClamped}%
      </div>
    </div>
  </div>
)
