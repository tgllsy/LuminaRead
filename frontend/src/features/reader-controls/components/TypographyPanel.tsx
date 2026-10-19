import React, { useState } from 'react'
import type { TypographyPanelProps, WeReadBottomTab } from '../types'
import { useTypographyRatios, useKeyboardEscape } from '../hooks'
import { ProgressScrubberTab } from './ProgressScrubberTab'
import { ThemeColorPickerTab } from './ThemeColorPickerTab'
import { FontLayoutSettingsTab } from './FontLayoutSettingsTab'
import { DesktopPanelHeader } from './DesktopPanelHeader'
import { MobileBottomNavBar } from './MobileBottomNavBar'
import { MobileFloatingActions } from './MobileFloatingActions'
import { MobileUnifiedAppearanceTab } from './MobileUnifiedAppearanceTab'

const MobileTypographyHudSheet: React.FC<
  TypographyPanelProps & {
    currentTab: WeReadBottomTab
    setTab: (t: WeReadBottomTab) => void
    showFontDrawer: boolean
    setShowFontDrawer: React.Dispatch<React.SetStateAction<boolean>>
    ratios: ReturnType<typeof useTypographyRatios>
  }
> = ({
  onClose, settings, onChange, chapterIndex = 0, totalChapters = 1, chapterTitle = '',
  progressPercent = 0, onSelectChapter, onOpenToc, onOpenNotesOrIdeas, onOpenAI, onOpenTTS,
  isTtsActive = false, getChapterTitle, bookId, currentTab, setTab, showFontDrawer, setShowFontDrawer, ratios,
}) => {
  const { isDark } = ratios
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 flex flex-col justify-end">
      <MobileFloatingActions onOpenAI={onOpenAI} onOpenTTS={onOpenTTS} isTtsActive={isTtsActive} isDark={isDark} />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-lg sm:mx-auto rounded-t-3xl px-5 pt-3.5 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] shadow-[0_-8px_36px_rgba(15,23,42,0.14)] border-t transition-colors ${
          isDark ? 'liquid-glass-dark bg-[#1c1c1e]/95 text-slate-100 border-slate-800' : 'liquid-glass bg-white/95 text-slate-900 border-slate-100'
        }`}
      >
        <div className="flex justify-center pb-2.5">
          <div className={`w-10 h-1.5 rounded-full ${isDark ? 'bg-white/20' : 'bg-slate-300/90'}`} />
        </div>
        {currentTab === 'progress' ? (
          <ProgressScrubberTab
            chapterIndex={chapterIndex} totalChapters={totalChapters} chapterTitle={chapterTitle}
            progressPercent={progressPercent} isDark={isDark} onSelectChapter={onSelectChapter}
            getChapterTitle={getChapterTitle} bookId={bookId}
          />
        ) : currentTab === 'theme' ? (
          <div className="pb-2">
            <ThemeColorPickerTab
              isDark={isDark} brightness={ratios.brightness} theme={settings.theme}
              bgTexture={ratios.bgTexture} brClamped={ratios.brClamped} brRatio={ratios.brRatio} onChange={onChange}
            />
          </div>
        ) : (
          <MobileUnifiedAppearanceTab
            isDark={isDark} settings={settings} onChange={onChange}
            showFontDrawer={showFontDrawer} setShowFontDrawer={setShowFontDrawer}
            fontRatio={ratios.fontRatio} fontClamped={ratios.fontClamped} marginRatio={ratios.marginRatio}
            lhRatio={ratios.lhRatio} lhClamped={ratios.lhClamped} brRatio={ratios.brRatio}
            brClamped={ratios.brClamped} currentFontMeta={ratios.currentFontMeta}
          />
        )}
        <MobileBottomNavBar
          currentTab={currentTab} setTab={setTab} isDark={isDark} onClose={onClose}
          onOpenToc={onOpenToc} onOpenNotesOrIdeas={onOpenNotesOrIdeas}
          onOpenAI={onOpenAI} onOpenTTS={onOpenTTS} isTtsActive={isTtsActive}
        />
      </div>
    </div>
  )
}

export const TypographyPanel: React.FC<TypographyPanelProps> = (props) => {
  const {
    isOpen, onClose, settings, onChange, activeTab = 'font', onTabChange,
    chapterIndex = 0, totalChapters = 1, chapterTitle = '', progressPercent = 0,
    onSelectChapter, getChapterTitle, bookId,
  } = props
  const [internalTab, setInternalTab] = useState<WeReadBottomTab>(activeTab)
  const [showFontDrawer, setShowFontDrawer] = useState(false)

  const currentTab = onTabChange ? activeTab : internalTab
  const setTab = (t: WeReadBottomTab) => { if (onTabChange) onTabChange(t); else setInternalTab(t) }

  useKeyboardEscape(isOpen, onClose, showFontDrawer, () => setShowFontDrawer(false))
  const ratios = useTypographyRatios(settings)

  if (!isOpen) return null
  const { isDark } = ratios

  return (
    <div
      data-no-hud-toggle="true" onClick={onClose}
      className="fixed inset-x-0 top-13 bottom-0 lg:inset-0 z-40 pointer-events-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`hidden lg:block fixed right-22 xl:right-28 top-1/2 -translate-y-1/2 w-[390px] rounded-3xl p-5 shadow-[0_12px_42px_rgba(15,23,42,0.18)] border transition-all ${
          isDark ? 'liquid-glass-dark bg-[#1e1e22]/95 text-slate-100 border-slate-800' : 'liquid-glass bg-white/95 text-slate-900 border-slate-200/90'
        }`}
      >
        <DesktopPanelHeader currentTab={currentTab} setTab={setTab} onClose={onClose} isDark={isDark} />
        {currentTab === 'progress' && (
          <ProgressScrubberTab
            chapterIndex={chapterIndex} totalChapters={totalChapters} chapterTitle={chapterTitle}
            progressPercent={progressPercent} isDark={isDark} onSelectChapter={onSelectChapter}
            getChapterTitle={getChapterTitle} bookId={bookId}
          />
        )}
        {currentTab === 'theme' && (
          <ThemeColorPickerTab
            isDark={isDark} brightness={ratios.brightness} theme={settings.theme}
            bgTexture={ratios.bgTexture} brClamped={ratios.brClamped} brRatio={ratios.brRatio} onChange={onChange}
          />
        )}
        {currentTab === 'font' && (
          <FontLayoutSettingsTab
            isDark={isDark} settings={settings} onChange={onChange}
            showFontDrawer={showFontDrawer} setShowFontDrawer={setShowFontDrawer}
            fontRatio={ratios.fontRatio} fontClamped={ratios.fontClamped} marginRatio={ratios.marginRatio}
            lhRatio={ratios.lhRatio} lhClamped={ratios.lhClamped} currentFontMeta={ratios.currentFontMeta}
          />
        )}
      </div>

      <MobileTypographyHudSheet
        {...props} currentTab={currentTab} setTab={setTab}
        showFontDrawer={showFontDrawer} setShowFontDrawer={setShowFontDrawer} ratios={ratios}
      />
    </div>
  )
}
