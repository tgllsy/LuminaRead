import { useState, useEffect } from 'react'
import type {
  SelectionState,
  FootnoteModalState,
  EntityWikiModalState,
  ReturnAnchorState,
  CopilotModalState,
  PosterModalState,
  LightboxImageState,
} from '../types'
import type { WeReadBottomTab } from '../../reader-controls'

export function useReaderOverlaysState() {
  const [showTypography, setShowTypography] = useState(false)
  const [activeBottomTab, setActiveBottomTab] = useState<WeReadBottomTab>('font')
  const [showAmbientTTS, setShowAmbientTTS] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<'toc' | 'search' | 'notes' | 'bookmarks'>('toc')
  const [drawerSearchInit, setDrawerSearchInit] = useState('')
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null)
  const [footnoteModal, setFootnoteModal] = useState<FootnoteModalState | null>(null)
  const [returnAnchor, setReturnAnchor] = useState<ReturnAnchorState | null>(null)
  const [copilotModal, setCopilotModal] = useState<CopilotModalState>({
    isOpen: false,
    mode: 'spoiler_free_recap',
    text: '',
    paragraphIndex: 0,
  })
  const [posterModal, setPosterModal] = useState<PosterModalState | null>(null)
  const [lightboxImage, setLightboxImage] = useState<LightboxImageState | null>(null)
  const [bookmarkToast, setBookmarkToast] = useState('')
  const [flashedParaIndex, setFlashedParaIndex] = useState<number | null>(null)
  const [highlightKeyword, setHighlightKeyword] = useState('')
  const [entityWikiModal, setEntityWikiModal] = useState<EntityWikiModalState | null>(null)

  useEffect(() => {
    if (flashedParaIndex === null) return
    const timer = setTimeout(() => setFlashedParaIndex(null), 2400)
    return () => clearTimeout(timer)
  }, [flashedParaIndex])

  return {
    showTypography, setShowTypography,
    activeBottomTab, setActiveBottomTab,
    showAmbientTTS, setShowAmbientTTS,
    drawerOpen, setDrawerOpen,
    drawerTab, setDrawerTab,
    drawerSearchInit, setDrawerSearchInit,
    selectionState, setSelectionState,
    footnoteModal, setFootnoteModal,
    returnAnchor, setReturnAnchor,
    copilotModal, setCopilotModal,
    posterModal, setPosterModal,
    lightboxImage, setLightboxImage,
    bookmarkToast, setBookmarkToast,
    flashedParaIndex, setFlashedParaIndex,
    highlightKeyword, setHighlightKeyword,
    entityWikiModal, setEntityWikiModal,
  }
}
