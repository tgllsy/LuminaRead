import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { FontLayoutSettingsTabProps, ReaderTypography } from '../types'
import { FontSizeSlider } from './FontSizeSlider'
import { PageMarginAndLineHeightSliders } from './PageMarginAndLineHeightSliders'
import { FontFamilyDrawer } from './FontFamilyDrawer'

const PageTurnAnimationRow: React.FC<{
  isDark: boolean
  pageTurnAnimation: ReaderTypography['pageTurnAnimation']
  onChange: (patch: Partial<ReaderTypography>) => void
}> = ({ isDark, pageTurnAnimation, onChange }) => (
  <div
    className={`h-11 rounded-2xl px-3 flex items-center justify-between text-xs transition-colors ${
      isDark ? 'bg-slate-800' : 'bg-[#f2f3f5]'
    }`}
  >
    <span className="font-medium opacity-70">翻页动效</span>
    <div className="flex items-center gap-1">
      {(
        [
          { key: 'curl', label: '3D仿真' },
          { key: 'slide', label: '平滑滑动' },
          { key: 'instant', label: '覆盖' },
        ] as const
      ).map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange({ pageTurnAnimation: item.key })}
          className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
            pageTurnAnimation === item.key
              ? 'bg-[#1b88ee] text-white shadow-xs font-semibold'
              : isDark
              ? 'text-slate-300 hover:bg-slate-700/60'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  </div>
)

const LayoutModeRow: React.FC<{
  isDark: boolean
  layoutMode: ReaderTypography['layoutMode']
  onChange: (patch: Partial<ReaderTypography>) => void
}> = ({ isDark, layoutMode, onChange }) => (
  <div
    className={`h-11 rounded-2xl px-3 flex items-center justify-between text-xs transition-colors ${
      isDark ? 'bg-slate-800' : 'bg-[#f2f3f5]'
    }`}
  >
    <span className="font-medium opacity-70">版面模式</span>
    <div className="flex items-center gap-1">
      {(
        [
          { key: 'single', label: '单栏阅读' },
          { key: 'dual', label: '双栏对开' },
        ] as const
      ).map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange({ layoutMode: item.key })}
          className={`px-3 py-1 rounded-xl text-xs font-medium transition-all ${
            (layoutMode || 'single') === item.key
              ? 'bg-[#1b88ee] text-white shadow-xs font-semibold'
              : isDark
              ? 'text-slate-300 hover:bg-slate-700/60'
              : 'text-slate-600 hover:bg-slate-200/60'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  </div>
)

const LayoutActionButtonsRow: React.FC<{
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
  const nextVariant = chineseVariant === 'original' ? 'simplified' : chineseVariant === 'simplified' ? 'traditional' : 'original'
  const variantLabel =
    chineseVariant === 'simplified' ? '简体' : chineseVariant === 'traditional' ? '繁體' : '原文'
  const baseBtnClass = isDark
    ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
    : 'bg-[#f2f3f5] text-slate-700 hover:bg-slate-200/75'
  const activeBtnClass = 'bg-[#1b88ee]/15 text-[#1b88ee] font-semibold ring-1 ring-[#1b88ee]/40'
  const btnCls = 'h-11 rounded-2xl px-1.5 flex items-center justify-center text-xs font-medium transition-colors'

  return (
    <div className="grid grid-cols-5 gap-1.5">
      <button
        type="button"
        onClick={() => setShowFontDrawer((v) => !v)}
        className={`${btnCls} gap-0.5 ${showFontDrawer ? 'bg-[#1b88ee] text-white' : baseBtnClass}`}
      >
        <span className="truncate">{showFontDrawer ? currentFontShortLabel : '字体样式'}</span>
        <ChevronRight className="w-3 h-3 opacity-60 shrink-0" />
      </button>

      <button
        type="button"
        onClick={() => onChange({ chineseVariant: nextVariant })}
        onContextMenu={(e) => { e.preventDefault(); onChange({ chineseVariant: 'original' }) }}
        title="点击轮换原文/简体/繁体（右键恢复原文）"
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
        title="开启章节首段首字下沉出版版式"
      >
        <span className="truncate">{settings.dropCap ? '下沉:开' : '首字下沉'}</span>
      </button>

      <button
        type="button"
        onClick={() => onChange({ continuousScroll: settings.continuousScroll === false })}
        title="开启后上下滚动至章末将自动无缝连接下一章"
        className={`${btnCls} ${
          settings.continuousScroll !== false ? 'bg-[#1b88ee]/15 text-[#1b88ee] font-semibold' : baseBtnClass
        }`}
      >
        <span className="truncate">{settings.continuousScroll !== false ? '章节连读' : '单章切换'}</span>
      </button>
    </div>
  )
}

export const FontLayoutSettingsTab: React.FC<FontLayoutSettingsTabProps> = ({
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
  <div className="space-y-3.5 pb-3">
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

    <LayoutActionButtonsRow
      isDark={isDark}
      settings={settings}
      showFontDrawer={showFontDrawer}
      setShowFontDrawer={setShowFontDrawer}
      currentFontShortLabel={currentFontMeta.shortLabel}
      onChange={onChange}
    />

    <LayoutModeRow
      isDark={isDark}
      layoutMode={settings.layoutMode}
      onChange={onChange}
    />

    <PageTurnAnimationRow
      isDark={isDark}
      pageTurnAnimation={settings.pageTurnAnimation}
      onChange={onChange}
    />

    {showFontDrawer && (
      <FontFamilyDrawer
        isDark={isDark}
        fontFamily={settings.fontFamily}
        bilingualMode={settings.bilingualMode}
        onChange={onChange}
      />
    )}
  </div>
)
