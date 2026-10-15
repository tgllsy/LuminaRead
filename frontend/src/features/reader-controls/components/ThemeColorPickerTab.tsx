import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { BRIGHTNESS_BOUNDS } from '../constants'
import type { ThemeColorPickerTabProps } from '../types'

export const ThemeColorPickerTab: React.FC<ThemeColorPickerTabProps> = ({
  isDark,
  theme,
  bgTexture,
  brClamped,
  brRatio,
  onChange,
}) => (
  <div className="space-y-4 pb-3">
    <BrightnessSlider isDark={isDark} brClamped={brClamped} brRatio={brRatio} onChange={onChange} />

    <div>
      <div className="text-xs text-slate-400 mb-2 font-medium">颜色</div>
      <div className="grid grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onChange({ theme: 'light', bgTexture: 'plain' })}
          aria-label="纯白主题"
          className={`h-11 rounded-xl bg-white transition-all flex items-center justify-center ${
            theme === 'light' && bgTexture === 'plain'
              ? 'border-2 border-[#1b88ee] shadow-xs'
              : 'border border-slate-200/90 hover:border-slate-300'
          }`}
        />
        <button
          type="button"
          onClick={() => onChange({ theme: 'parchment', bgTexture: 'plain' })}
          aria-label="暖黄羊皮纸主题"
          className={`h-11 rounded-xl bg-[#f3ead8] transition-all flex items-center justify-center ${
            theme === 'parchment' && bgTexture === 'plain'
              ? 'border-2 border-[#1b88ee] shadow-xs'
              : 'border border-[#e6dac3]'
          }`}
        />
        <button
          type="button"
          onClick={() => onChange({ theme: 'sepia_green', bgTexture: 'plain' })}
          aria-label="护眼豆沙绿主题"
          className={`h-11 rounded-xl bg-[#d6ebd2] transition-all flex items-center justify-center ${
            theme === 'sepia_green' && bgTexture === 'plain'
              ? 'border-2 border-[#1b88ee] shadow-xs'
              : 'border border-[#c1dfc0]'
          }`}
        />
        <button
          type="button"
          onClick={() => onChange({ theme: 'dark', bgTexture: 'plain' })}
          aria-label="深邃暗夜主题"
          className={`h-11 rounded-xl bg-[#0a0b0d] transition-all flex items-center justify-center ${
            theme === 'dark' ? 'border-2 border-[#1b88ee] shadow-xs' : 'border border-slate-800'
          }`}
        >
          <Moon className="w-4 h-4 text-[#1b88ee] fill-[#1b88ee]" />
        </button>
      </div>
    </div>

    <BackgroundTextureSwatches theme={theme} bgTexture={bgTexture} onChange={onChange} />
  </div>
)

const BrightnessSlider: React.FC<
  Pick<ThemeColorPickerTabProps, 'isDark' | 'brClamped' | 'brRatio' | 'onChange'>
> = ({ isDark, brClamped, brRatio, onChange }) => (
  <div
    className={`h-11 rounded-full px-3.5 flex items-center gap-2 relative select-none ${
      isDark ? 'bg-slate-800' : 'bg-[#eff0f2]'
    }`}
  >
    <Sun className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 pointer-events-none" />
    <div className="flex-1 relative h-full flex items-center">
      <div
        style={{ width: `${brRatio * 100}%` }}
        className="h-1.5 rounded-full bg-[#1b88ee]/35 pointer-events-none"
      />
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
        className={`absolute top-1/2 -translate-y-1/2 w-[34px] h-[34px] rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.16)] flex items-center justify-center text-[10px] font-mono font-semibold pointer-events-none z-20 ${
          isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-700'
        }`}
      >
        {brClamped}%
      </div>
    </div>
  </div>
)

const BackgroundTextureSwatches: React.FC<
  Pick<ThemeColorPickerTabProps, 'theme' | 'bgTexture' | 'onChange'>
> = ({ theme, bgTexture, onChange }) => (
  <div>
    <div className="text-xs text-slate-400 mb-2 font-medium">背景</div>
    <div className="grid grid-cols-5 gap-2.5">
      <button
        type="button"
        onClick={() => onChange({ theme: 'light', bgTexture: 'plain' })}
        title="纯净白纸"
        className={`h-10 rounded-full bg-white transition-all ${
          theme === 'light' && bgTexture === 'plain' ? 'border-2 border-[#1b88ee]' : 'border border-slate-200/90'
        }`}
      />
      <button
        type="button"
        onClick={() => onChange({ theme: 'light', bgTexture: 'paper' })}
        title="宣纸肌理"
        className={`h-10 rounded-full bg-[#f5f4f0] transition-all ${
          bgTexture === 'paper' ? 'border-2 border-[#1b88ee]' : 'border border-slate-200/80'
        }`}
      />
      <button
        type="button"
        onClick={() => onChange({ theme: 'eink', bgTexture: 'grain' })}
        title="E-Ink 墨水屏零残影模式"
        className={`h-10 rounded-full bg-[#f1f3f5] transition-all flex items-center justify-center text-[10px] font-mono text-slate-500 ${
          theme === 'eink' || bgTexture === 'grain'
            ? 'border-2 border-[#1b88ee] font-bold text-[#1b88ee]'
            : 'border border-slate-200/80'
        }`}
      >
        E-Ink
      </button>
      <button
        type="button"
        onClick={() => onChange({ theme: 'parchment', bgTexture: 'dune' })}
        title="暖阳沙丘"
        className={`h-10 rounded-full bg-gradient-to-b from-[#f9f2ec] via-[#f2dfd0] to-[#e5cbb4] transition-all ${
          bgTexture === 'dune' ? 'border-2 border-[#1b88ee]' : 'border border-[#e5d2c0]'
        }`}
      />
      <button
        type="button"
        onClick={() => onChange({ theme: 'light', bgTexture: 'moonlight' })}
        title="静谧月夜"
        className={`h-10 rounded-full bg-gradient-to-br from-[#b0cee6] via-[#c2dced] to-[#e2f0f9] transition-all ${
          bgTexture === 'moonlight' ? 'border-2 border-[#1b88ee]' : 'border border-[#b9d4e8]'
        }`}
      />
    </div>
  </div>
)
