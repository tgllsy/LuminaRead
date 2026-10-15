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

export const TypographyPanel: React.FC<TypographyPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  activeTab = 'font',
  onTabChange,
  chapterIndex = 0,
  totalChapters = 1,
  chapterTitle = '',
  progressPercent = 0,
  onSelectChapter,
  onOpenToc,
  onOpenNotesOrIdeas,
  onOpenAI,
  onOpenTTS,
  isTtsActive = false,
  getChapterTitle,
  bookId,
}) => {
  const [internalTab, setInternalTab] = useState<WeReadBottomTab>(activeTab)
  const [showFontDrawer, setShowFontDrawer] = useState(false)

  const currentTab = onTabChange ? activeTab : internalTab
  const setTab = (t: WeReadBottomTab) => {
    if (onTabChange) onTabChange(t)
    else setInternalTab(t)
  }

  useKeyboardEscape(isOpen, onClose, showFontDrawer, () =>
    setShowFontDrawer(false)
  )

  const ratios = useTypographyRatios(settings)

  if (!isOpen) return null

  const { isDark } = ratios

  const renderTabBody = () => (
    <>
      {currentTab === 'progress' && (
        <ProgressScrubberTab
          chapterIndex={chapterIndex}
          totalChapters={totalChapters}
          chapterTitle={chapterTitle}
          progressPercent={progressPercent}
          isDark={isDark}
          onSelectChapter={onSelectChapter}
          getChapterTitle={getChapterTitle}
          bookId={bookId}
        />
      )}

      {currentTab === 'theme' && (
        <ThemeColorPickerTab
          isDark={isDark}
          brightness={ratios.brightness}
          theme={settings.theme}
          bgTexture={ratios.bgTexture}
          brClamped={ratios.brClamped}
          brRatio={ratios.brRatio}
          onChange={onChange}
        />
      )}

      {currentTab === 'font' && (
        <FontLayoutSettingsTab
          isDark={isDark}
          settings={settings}
          onChange={onChange}
          showFontDrawer={showFontDrawer}
          setShowFontDrawer={setShowFontDrawer}
          fontRatio={ratios.fontRatio}
          fontClamped={ratios.fontClamped}
          marginRatio={ratios.marginRatio}
          lhRatio={ratios.lhRatio}
          lhClamped={ratios.lhClamped}
          currentFontMeta={ratios.currentFontMeta}
        />
      )}
    </>
  )

  return (
    <div
      data-no-hud-toggle="true"
      onClick={onClose}
      className="fixed inset-x-0 top-13 bottom-0 lg:inset-0 z-40 pointer-events-auto"
    >
      {/* 1. PC DESKTOP POPOVER CARD */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`hidden lg:block fixed right-22 xl:right-28 top-1/2 -translate-y-1/2 w-[390px] rounded-3xl p-5 shadow-[0_12px_42px_rgba(15,23,42,0.18)] border transition-all ${
          isDark
            ? 'bg-[#1e1e22] text-slate-100 border-slate-800'
            : 'bg-white text-slate-900 border-slate-200/90'
        }`}
      >
        <DesktopPanelHeader
          currentTab={currentTab}
          setTab={setTab}
          onClose={onClose}
          isDark={isDark}
        />
        {renderTabBody()}
      </div>

      {/* 2. MOBILE BOTTOM SHEET (WeChat Read App Style, < 1024px) */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 flex flex-col justify-end">
        <MobileFloatingActions
          onOpenAI={onOpenAI}
          onOpenTTS={onOpenTTS}
          isTtsActive={isTtsActive}
          isDark={isDark}
        />

        <div
          onClick={(e) => e.stopPropagation()}
          className={`w-full sm:max-w-lg sm:mx-auto rounded-t-3xl px-5 pt-5 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] shadow-[0_-8px_36px_rgba(15,23,42,0.14)] border-t transition-colors ${
            isDark
              ? 'bg-[#1c1c1e] text-slate-100 border-slate-800'
              : 'bg-white text-slate-900 border-slate-100'
          }`}
        >
          {currentTab === 'progress' ? (
            <ProgressScrubberTab
              chapterIndex={chapterIndex}
              totalChapters={totalChapters}
              chapterTitle={chapterTitle}
              progressPercent={progressPercent}
              isDark={isDark}
              onSelectChapter={onSelectChapter}
              getChapterTitle={getChapterTitle}
              bookId={bookId}
            />
          ) : currentTab === 'theme' ? (
            <div className="pb-2">
              <ThemeColorPickerTab
                isDark={isDark}
                brightness={ratios.brightness}
                theme={settings.theme}
                bgTexture={ratios.bgTexture}
                brClamped={ratios.brClamped}
                brRatio={ratios.brRatio}
                onChange={onChange}
              />
            </div>
          ) : (
            <MobileUnifiedAppearanceTab
              isDark={isDark}
              settings={settings}
              onChange={onChange}
              showFontDrawer={showFontDrawer}
              setShowFontDrawer={setShowFontDrawer}
              fontRatio={ratios.fontRatio}
              fontClamped={ratios.fontClamped}
              marginRatio={ratios.marginRatio}
              lhRatio={ratios.lhRatio}
              lhClamped={ratios.lhClamped}
              brRatio={ratios.brRatio}
              brClamped={ratios.brClamped}
              currentFontMeta={ratios.currentFontMeta}
            />
          )}

          <MobileBottomNavBar
            currentTab={currentTab}
            setTab={setTab}
            isDark={isDark}
            onClose={onClose}
            onOpenToc={onOpenToc}
            onOpenNotesOrIdeas={onOpenNotesOrIdeas}
            onOpenAI={onOpenAI}
            onOpenTTS={onOpenTTS}
            isTtsActive={isTtsActive}
          />
        </div>
      </div>
    </div>
  )
}
