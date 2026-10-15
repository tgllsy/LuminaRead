import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { ReaderTypography, FontItem } from '../types'
import { FontSizeSlider } from './FontSizeSlider'
import { PageMarginAndLineHeightSliders } from './PageMarginAndLineHeightSliders'
import { FontFamilyDrawer } from './FontFamilyDrawer'

export interface MobileUnifiedAppearanceTabProps {
  isDark: boolean
  settings: ReaderTypography
  onChange: (patch: Partial<ReaderTypography>) => void
  showFontDrawer: boolean
  setShowFontDrawer: React.Dispatch<React.SetStateAction<boolean>>
  fontRatio: number
  fontClamped: number
  marginRatio: number
  lhRatio: number
  lhClamped: number
  brRatio?: number
  brClamped?: number
  currentFontMeta: FontItem
}

const MobileLayoutActionRow: React.FC<{
  isDark: boolean
  settings: ReaderTypography
  showFontDrawer: boolean
  setShowFontDrawer: React.Dispatch<React.SetStateAction<boolean>>
  currentFontShortLabel: string
  onChange: (patch: Partial<ReaderTypography>) => void
}> = ({ isDark, settings, showFontDrawer, setShowFontDrawer, currentFontShortLabel, onChange }) => {
  const firstLineIndent = settings.firstLineIndent !== false
  const chineseVariant = settings.chineseVariant ?? 'original'
  const isVariantConverted = chineseVariant !== 'original'
  const nextVariant =
    chineseVariant === 'original'
      ? 'simplified'
      : chineseVariant === 'simplified'
      ? 'traditional'
      : 'original'
  const variantLabel =
    chineseVariant === 'simplified' ? '简体' : chineseVariant === 'traditional' ? '繁體' : '原文'
  const baseBtnClass = isDark ? 'bg-slate-800 text-slate-200' : 'bg-[#f2f3f5] text-slate-700'
  const activeBtnClass = 'bg-[#1b88ee]/15 text-[#1b88ee] font-semibold ring-1 ring-[#1b88ee]/40'
  const btnCls = 'h-10 rounded-2xl px-2 flex items-center justify-center text-xs font-medium transition-colors'
  const nextAnim =
    settings.pageTurnAnimation === 'curl' ? 'slide' : settings.pageTurnAnimation === 'slide' ? 'instant' : 'curl'
  const animLabel =
    settings.pageTurnAnimation === 'curl' ? '仿真' : settings.pageTurnAnimation === 'slide' ? '滑动' : '覆盖'

  return (
    <div className="grid grid-cols-3 gap-2">
      <button
        type="button"
        onClick={() => setShowFontDrawer((v) => !v)}
        className={`${btnCls} gap-1 ${showFontDrawer ? 'bg-[#1b88ee] text-white' : baseBtnClass}`}
      >
        <span className="truncate">{showFontDrawer ? currentFontShortLabel : '字体样式'}</span>
        <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
      </button>

      <button
        type="button"
        onClick={() => onChange({ chineseVariant: nextVariant })}
        onContextMenu={(e) => { e.preventDefault(); onChange({ chineseVariant: 'original' }) }}
        title="点击轮换原文/简体/繁体（长按恢复原文）"
        className={`${btnCls} ${isVariantConverted ? activeBtnClass : baseBtnClass}`}
      >
        <span className="truncate">{variantLabel}</span>
      </button>

      <button
        type="button"
        onClick={() => onChange({ firstLineIndent: !firstLineIndent })}
        className={`${btnCls} ${firstLineIndent ? baseBtnClass : 'bg-[#1b88ee]/15 text-[#1b88ee] font-semibold'}`}
      >
        <span className="truncate">{firstLineIndent ? '首行缩进' : '顶格对齐'}</span>
      </button>

      <button
        type="button"
        onClick={() => onChange({ dropCap: !settings.dropCap })}
        className={`${btnCls} ${settings.dropCap ? activeBtnClass : baseBtnClass}`}
        title="切换首字下沉出版版式"
      >
        <span className="truncate">{settings.dropCap ? '下沉:开' : '首字下沉'}</span>
      </button>

      <button
        type="button"
        onClick={() => onChange({ pageTurnAnimation: nextAnim })}
        className={`${btnCls} ${
          settings.pageTurnAnimation === 'curl'
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
            : settings.pageTurnAnimation === 'slide'
            ? 'bg-[#1b88ee]/15 text-[#1b88ee] font-semibold'
            : baseBtnClass
        }`}
        title="切换翻页动效"
      >
        <span className="truncate">翻页: {animLabel}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          const nextEink = !settings.eInkMode
          onChange({ eInkMode: nextEink, theme: nextEink ? 'eink' : 'light' })
        }}
        className={`${btnCls} ${
          settings.eInkMode ? 'bg-black text-white dark:bg-white dark:text-black font-bold ring-2 ring-black' : baseBtnClass
        }`}
        title="切换墨水屏黑白高对比无动画模式"
      >
        <span className="truncate">{settings.eInkMode ? '墨水屏:开' : '墨水屏'}</span>
      </button>
    </div>
  )
}

export const MobileUnifiedAppearanceTab: React.FC<MobileUnifiedAppearanceTabProps> = ({
  isDark,
  settings,
  onChange,
  showFontDrawer,
  setShowFontDrawer,
  fontRatio,
  fontClamped,
  marginRatio,
  lhRatio,
  lhClamped,
  currentFontMeta,
}) => (
  <div className="space-y-3.5 pb-2">
    <FontSizeSlider
      fontSize={settings.fontSize}
      fontRatio={fontRatio}
      fontClamped={fontClamped}
      isDark={isDark}
      onChange={onChange}
    />

    <PageMarginAndLineHeightSliders
      isDark={isDark}
      pageWidth={settings.pageWidth}
      marginRatio={marginRatio}
      lineHeight={settings.lineHeight}
      lhRatio={lhRatio}
      lhClamped={lhClamped}
      onChange={onChange}
    />

    <MobileLayoutActionRow
      isDark={isDark}
      settings={settings}
      showFontDrawer={showFontDrawer}
      setShowFontDrawer={setShowFontDrawer}
      currentFontShortLabel={currentFontMeta.shortLabel}
      onChange={onChange}
    />

    {showFontDrawer && (
      <div className="pt-2">
        <FontFamilyDrawer
          isDark={isDark}
          fontFamily={settings.fontFamily}
          bilingualMode={settings.bilingualMode}
          onChange={onChange}
        />
      </div>
    )}
  </div>
)
