import { create } from 'zustand'
import type { ReaderTypography } from '../types'
import { resolveNextChineseVariant } from '../utils/chineseConversion'

const TYPOGRAPHY_STORAGE_KEY = 'luminaread_typography_v2'
const LEGACY_TYPOGRAPHY_STORAGE_KEY = 'luminaread_typography_v1'
const SIDEBAR_PIN_STORAGE_KEY = 'luminaread_sidebar_pinned'
const SIDEBAR_DOCK_SIDE_KEY = 'lumina_sidebar_dock_side'

const DEFAULT_TYPOGRAPHY: ReaderTypography = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 19,
  lineHeight: 1.65,
  layoutMode: 'single',
  pageWidth: 880,
  bilingualMode: false,
  brightness: 100,
  firstLineIndent: true,
  bgTexture: 'plain',
  continuousScroll: true,
  pageTurnAnimation: 'curl',
  eInkMode: false,
  wpmReadingSpeed: 400,
  dropCap: false,
  chineseVariant: 'original',
}

function loadSavedTypography(): ReaderTypography {
  try {
    const saved =
      typeof window !== 'undefined'
        ? localStorage.getItem(TYPOGRAPHY_STORAGE_KEY) || localStorage.getItem(LEGACY_TYPOGRAPHY_STORAGE_KEY)
        : null
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.lineHeight === 1.5) parsed.lineHeight = 1.15
      const validFamilies = [
        'kaiti',
        'serif',
        'sans',
        'fangsong',
        'system-sans',
        'kaiti-classic',
        'mono',
      ]
      if (parsed.fontFamily && !validFamilies.includes(parsed.fontFamily)) {
        parsed.fontFamily = DEFAULT_TYPOGRAPHY.fontFamily
      }
      const validAnimations = ['slide', 'curl', 'instant']
      if (parsed.pageTurnAnimation && !validAnimations.includes(parsed.pageTurnAnimation)) {
        parsed.pageTurnAnimation = DEFAULT_TYPOGRAPHY.pageTurnAnimation
      }
      const validVariants = ['original', 'simplified', 'traditional']
      if (parsed.chineseVariant && !validVariants.includes(parsed.chineseVariant)) {
        parsed.chineseVariant = 'original'
      }
      return { ...DEFAULT_TYPOGRAPHY, ...parsed }
    }
  } catch {
    // ignore
  }
  return DEFAULT_TYPOGRAPHY
}

function loadSavedSidebarPin(): boolean {
  try {
    if (typeof window === 'undefined') return true
    const dockSide = localStorage.getItem(SIDEBAR_DOCK_SIDE_KEY)
    if (dockSide === 'left' || dockSide === 'right') return true
    if (dockSide === 'none') return false
    const saved = localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY)
    return saved !== null ? saved === 'true' : true
  } catch {
    return true
  }
}

interface TypographyStoreState {
  typography: ReaderTypography
  isSidebarPinned: boolean

  setTypography: (
    updater: Partial<ReaderTypography> | ((prev: ReaderTypography) => ReaderTypography)
  ) => void
  toggleChineseVariant: (sampleText?: string) => void
  toggleSidebarPin: () => void
}

export const useTypographyStore = create<TypographyStoreState>((set) => ({
  typography: loadSavedTypography(),
  isSidebarPinned: loadSavedSidebarPin(),

  setTypography: (updater) =>
    set((state) => {
      const next =
        typeof updater === 'function' ? updater(state.typography) : { ...state.typography, ...updater }
      try {
        localStorage.setItem(TYPOGRAPHY_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return { typography: next }
    }),

  toggleChineseVariant: (sampleText?: string) =>
    set((state) => {
      const nextVariant = resolveNextChineseVariant(state.typography.chineseVariant, sampleText)
      const next: ReaderTypography = { ...state.typography, chineseVariant: nextVariant }
      try {
        localStorage.setItem(TYPOGRAPHY_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return { typography: next }
    }),

  toggleSidebarPin: () =>
    set((state) => {
      const next = !state.isSidebarPinned
      try {
        localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, String(next))
        localStorage.setItem(SIDEBAR_DOCK_SIDE_KEY, next ? 'left' : 'none')
      } catch {
        // ignore
      }
      return { isSidebarPinned: next }
    }),
}))
