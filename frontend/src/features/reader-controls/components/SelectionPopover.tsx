import React from 'react'
import { X } from 'lucide-react'
import type { SelectionPopoverProps } from '../types'
import {
  useSelectionPopoverPosition,
  useSelectionHighlightState,
} from '../hooks'
import { getSurfaceClass, getPillButtonClass } from '../helpers'
import { HighlightColorPicker } from './HighlightColorPicker'
import { SelectionActionPills } from './SelectionActionPills'
import { SelectionNoteEditor } from './SelectionNoteEditor'
import { MobileSelectionBar } from './MobileSelectionBar'

export const SelectionPopover: React.FC<SelectionPopoverProps> = ({
  selectedText,
  paragraphIndex,
  existingHighlight,
  openNoteEditorInitially = false,
  anchorRect,
  theme = 'light',
  onClose,
  onCreateOrUpdateHighlight,
  onDeleteHighlight,
  onAskAICopilot,
  onSearchInBook,
  onGeneratePoster,
  onStartTTSFromParagraph,
}) => {
  const isDark = theme === 'dark'

  const {
    color,
    setColor,
    styleType,
    setStyleType,
    showNoteInput,
    setShowNoteInput,
    note,
    setNote,
    copied,
    handleCopy,
  } = useSelectionHighlightState(
    existingHighlight,
    openNoteEditorInitially,
    selectedText
  )

  const { desktopFloatingStyle, floatingStyle, isMobile } = useSelectionPopoverPosition(
    anchorRect,
    selectedText,
    openNoteEditorInitially,
    showNoteInput
  )

  if (!selectedText) return null

  const surfaceClass = getSurfaceClass(isDark)
  const pillBtnClass = getPillButtonClass(isDark)

  const handleColorSelect = (newColor: typeof color) => {
    setColor(newColor)
    onCreateOrUpdateHighlight({
      color: newColor,
      style_type: styleType,
      note,
    })
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleStyleSelect = (newStyle: typeof styleType) => {
    setStyleType(newStyle)
    onCreateOrUpdateHighlight({
      color,
      style_type: newStyle,
      note,
    })
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges()
    }
  }

  const handleSaveNote = () => {
    onCreateOrUpdateHighlight({
      color,
      style_type: styleType,
      note,
    })
    setShowNoteInput(false)
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges()
    }
  }

  // Mobile Viewport (< 768px): Render compact mobile selection bar directly under the paragraph
  if (isMobile || !desktopFloatingStyle) {
    return (
      <MobileSelectionBar
        selectedText={selectedText}
        paragraphIndex={paragraphIndex}
        existingHighlight={existingHighlight}
        color={color}
        styleType={styleType}
        note={note}
        showNoteInput={showNoteInput}
        copied={copied}
        isDark={isDark}
        floatingStyle={floatingStyle}
        onClose={onClose}
        onSelectColor={handleColorSelect}
        onSelectStyle={handleStyleSelect}
        setShowNoteInput={setShowNoteInput}
        setNote={setNote}
        onSaveNote={handleSaveNote}
        handleCopy={handleCopy}
        onAskAICopilot={onAskAICopilot}
        onSearchInBook={onSearchInBook}
        onGeneratePoster={onGeneratePoster}
        onStartTTSFromParagraph={onStartTTSFromParagraph}
        onDeleteHighlight={onDeleteHighlight}
      />
    )
  }

  return (
    <div
      data-no-hud-toggle="true"
      onClick={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={desktopFloatingStyle}
      className={`z-[60] max-h-[82dvh] overflow-y-auto rounded-3xl backdrop-blur-md p-4 border space-y-3 animate-in fade-in duration-150 ${surfaceClass}`}
    >
      {/* Top Preview & Close */}
      <div
        className={`flex items-start justify-between gap-3 border-b pb-2.5 ${
          isDark ? 'border-white/8' : 'border-slate-100'
        }`}
      >
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-semibold text-[#1b88ee]">
            {existingHighlight ? '已划线笔记' : '划词菜单'}
          </span>
          <p
            className={`text-xs line-clamp-1 font-serif mt-0.5 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            “{selectedText}”
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded-full transition-colors ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/10'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Existing Note Display Banner */}
      {existingHighlight?.note && (
        <div
          onClick={() => setShowNoteInput(true)}
          className={`p-2.5 rounded-2xl text-xs cursor-pointer flex items-start justify-between gap-2 ${
            isDark
              ? 'bg-amber-500/15 border border-amber-400/30 text-amber-200'
              : 'bg-amber-50 border border-amber-200/80 text-slate-700'
          }`}
        >
          <div className="leading-relaxed">
            <span className="font-bold text-amber-600 dark:text-amber-300">
              💡 想法：
            </span>
            <span>{existingHighlight.note}</span>
          </div>
          {!showNoteInput && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-200 shrink-0">
              编辑
            </span>
          )}
        </div>
      )}

      {/* 5 Colors + 3 Line Styles */}
      <HighlightColorPicker
        color={color}
        styleType={styleType}
        isDark={isDark}
        onSelectColor={handleColorSelect}
        onSelectStyle={handleStyleSelect}
      />

      {/* Unified Action Pills Row */}
      <SelectionActionPills
        selectedText={selectedText}
        paragraphIndex={paragraphIndex}
        note={note}
        showNoteInput={showNoteInput}
        setShowNoteInput={setShowNoteInput}
        copied={copied}
        existingHighlight={existingHighlight}
        pillBtnClass={pillBtnClass}
        onStartTTSFromParagraph={onStartTTSFromParagraph}
        onAskAICopilot={onAskAICopilot}
        onSearchInBook={onSearchInBook}
        onGeneratePoster={onGeneratePoster}
        handleCopy={handleCopy}
        onDeleteHighlight={onDeleteHighlight}
      />

      {/* Thought / Note Editor */}
      {showNoteInput && (
        <SelectionNoteEditor
          note={note}
          setNote={setNote}
          isDark={isDark}
          pillBtnClass={pillBtnClass}
          onClose={() => setShowNoteInput(false)}
          onSave={handleSaveNote}
        />
      )}
    </div>
  )
}
