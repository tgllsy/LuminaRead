import { useState, useEffect, useCallback, useRef } from 'react'
import type { HighlightItem } from '../types'

export function useSelectionHighlightState(
  existingHighlight: HighlightItem | null | undefined,
  openNoteEditorInitially: boolean,
  selectedText: string
): {
  color: HighlightItem['color']
  setColor: React.Dispatch<React.SetStateAction<HighlightItem['color']>>
  styleType: HighlightItem['style_type']
  setStyleType: React.Dispatch<React.SetStateAction<HighlightItem['style_type']>>
  showNoteInput: boolean
  setShowNoteInput: React.Dispatch<React.SetStateAction<boolean>>
  note: string
  setNote: React.Dispatch<React.SetStateAction<string>>
  copied: boolean
  handleCopy: () => void
} {
  const [color, setColor] = useState<HighlightItem['color']>(
    existingHighlight?.color || 'yellow'
  )
  const [styleType, setStyleType] = useState<HighlightItem['style_type']>(
    existingHighlight?.style_type || 'marker'
  )
  const [showNoteInput, setShowNoteInput] = useState<boolean>(
    Boolean(existingHighlight?.note) || openNoteEditorInitially
  )
  const [note, setNote] = useState<string>(existingHighlight?.note || '')
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    }
  }, [])

  useEffect(() => {
    setColor(existingHighlight?.color || 'yellow')
    setStyleType(existingHighlight?.style_type || 'marker')
    setNote(existingHighlight?.note || '')
    setShowNoteInput(Boolean(existingHighlight?.note) || openNoteEditorInitially)
  }, [existingHighlight, selectedText, openNoteEditorInitially])

  const handleCopy = useCallback(() => {
    if (!selectedText) return
    navigator.clipboard?.writeText(selectedText)
    setCopied(true)
    if (typeof window !== 'undefined') {
      window.getSelection()?.removeAllRanges()
    }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current)
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }, [selectedText])

  return {
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
  }
}
