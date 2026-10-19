import { create } from 'zustand'
import type { JumpTarget } from '../types'
import { stopLocalTts } from '../features/audio-tts/helpers/globalTtsCoordinator'

interface ReaderNavSession {
  bookId: string
  chapterIndex: number
  paragraphIndex?: number
}

const STORAGE_KEY = 'luminaread_last_nav_session'

function getInitialState() {
  let isReaderOpen = false
  let activeBookId: string | null = null
  let chapterIndex = 0
  let jumpTarget: JumpTarget | null = null
  let activePage: 'shelf' | 'discovery' | 'search' | 'stats' | 'sources' | 'notes' | 'tts' = 'shelf'

  // 1. Try URL Query (?book=xxx&ch=0&tab=xxx)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const tabParam = params.get('tab')
    const validPages: Array<'shelf' | 'discovery' | 'search' | 'stats' | 'sources' | 'notes' | 'tts'> = [
      'shelf', 'discovery', 'search', 'stats', 'sources', 'notes', 'tts',
    ]
    if (tabParam && validPages.includes(tabParam as any)) {
      activePage = tabParam as any
    }

    const bookParam = params.get('book')
    const chParam = params.get('ch')
    if (bookParam) {
      isReaderOpen = true
      activeBookId = bookParam
      if (chParam !== null) {
        chapterIndex = Math.max(0, parseInt(chParam, 10) || 0)
        jumpTarget = { bookId: bookParam, chapterIndex }
      } else {
        // ch is not in query, do not force jumpTarget with chapterIndex 0
        jumpTarget = null
      }
    } else {
      // 2. Try localStorage session restore
      try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
          const parsed = JSON.parse(saved) as ReaderNavSession
          if (parsed?.bookId) {
            activeBookId = parsed.bookId
            chapterIndex = parsed.chapterIndex || 0
          }
        }
      } catch {
        // ignore
      }
    }
  }

  return {
    isReaderOpen,
    activeBookId,
    chapterIndex,
    jumpTarget,
    openTabBookIds: activeBookId ? [activeBookId] : [],
    activePage,
  }
}

interface ReaderNavState {
  isReaderOpen: boolean
  activeBookId: string | null
  chapterIndex: number
  jumpTarget: JumpTarget | null
  openTabBookIds: string[]
  tabChapters: Record<string, number>
  activePage: 'shelf' | 'discovery' | 'search' | 'stats' | 'sources' | 'notes' | 'tts'

  // Actions
  openBook: (target: JumpTarget, pushHistory?: boolean) => void
  closeReader: (pushHistory?: boolean) => void
  switchBookTab: (bookId: string) => void
  closeBookTab: (bookId: string) => void
  setChapterIndex: (chIdx: number, replaceHistory?: boolean) => void
  setActivePage: (page: 'shelf' | 'discovery' | 'search' | 'stats' | 'sources' | 'notes' | 'tts') => void
  syncFromBrowserUrl: () => void
}

const persistSession = (bookId: string | null, chIdx: number) => {
  try {
    if (bookId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookId, chapterIndex: chIdx }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}

let replaceUrlTimer: ReturnType<typeof setTimeout> | null = null

const applyHistoryUrl = (bookId: string | null, chIdx: number, replace: boolean, page?: string) => {
  if (typeof window === 'undefined') return
  try {
    const currentUrl = new URL(window.location.href)
    if (bookId) {
      currentUrl.searchParams.set('book', bookId)
      currentUrl.searchParams.set('ch', String(chIdx))
    } else {
      currentUrl.searchParams.delete('book')
      currentUrl.searchParams.delete('ch')
    }

    if (page && page !== 'shelf') {
      currentUrl.searchParams.set('tab', page)
    } else if (page === 'shelf') {
      currentUrl.searchParams.delete('tab')
    }

    const nextSearch = currentUrl.searchParams.toString()
    const nextHref = nextSearch
      ? `${currentUrl.pathname}?${nextSearch}${currentUrl.hash}`
      : `${currentUrl.pathname}${currentUrl.hash}`

    if (replace) {
      window.history.replaceState({ bookId, chIdx, page }, '', nextHref)
    } else {
      window.history.pushState({ bookId, chIdx, page }, '', nextHref)
    }
  } catch {
    // Ignore browser SecurityError when history.replaceState is throttled during rapid scrubbing
  }
}

const updateUrl = (bookId: string | null, chIdx: number, replace = false, page?: string) => {
  if (typeof window === 'undefined') return
  if (replaceUrlTimer) {
    clearTimeout(replaceUrlTimer)
    replaceUrlTimer = null
  }
  if (replace) {
    replaceUrlTimer = setTimeout(() => {
      replaceUrlTimer = null
      applyHistoryUrl(bookId, chIdx, true, page)
    }, 150)
  } else {
    applyHistoryUrl(bookId, chIdx, false, page)
  }
}

function computeClosedTabState(state: ReaderNavState, bookId: string): Partial<ReaderNavState> {
  const nextTabs = state.openTabBookIds.filter((id) => id !== bookId)
  const nextTabChapters = { ...state.tabChapters }
  delete nextTabChapters[bookId]
  if (state.activeBookId !== bookId) {
    return { openTabBookIds: nextTabs, tabChapters: nextTabChapters }
  }
  if (nextTabs[0]) {
    const nextId = nextTabs[0]
    const savedCh = nextTabChapters[nextId]
    const nextCh = savedCh ?? 0
    updateUrl(nextId, nextCh, true)
    persistSession(nextId, nextCh)
    return {
      openTabBookIds: nextTabs,
      tabChapters: nextTabChapters,
      activeBookId: nextId,
      chapterIndex: nextCh,
      jumpTarget: savedCh !== undefined ? { bookId: nextId, chapterIndex: savedCh } : null,
    }
  }
  updateUrl(null, 0, true)
  persistSession(null, 0)
  return {
    openTabBookIds: nextTabs,
    tabChapters: nextTabChapters,
    activeBookId: null,
    isReaderOpen: false,
    jumpTarget: null,
  }
}

export const useReaderNavStore = create<ReaderNavState>((set, get) => {
  const init = getInitialState()

  return {
    ...init,
    tabChapters: init.activeBookId ? { [init.activeBookId]: init.chapterIndex } : {},

    openBook: (target, pushHistory = true) => {
      const prevActiveBookId = get().activeBookId
      if (prevActiveBookId && prevActiveBookId !== target.bookId) {
        stopLocalTts(`Navigated to book ${target.bookId}`)
      }
      const explicitCh = target.chapterIndex ?? get().tabChapters[target.bookId]
      const hasSpecificCh = explicitCh !== undefined
      const chIdx = explicitCh ?? 0
      const enrichedTarget: JumpTarget | null = hasSpecificCh
        ? { ...target, chapterIndex: chIdx }
        : (target.paragraphIndex !== undefined || target.scrollOffset !== undefined)
        ? target
        : null

      set((state) => ({
        isReaderOpen: true,
        activeBookId: target.bookId,
        chapterIndex: chIdx,
        jumpTarget: enrichedTarget,
        tabChapters: hasSpecificCh ? { ...state.tabChapters, [target.bookId]: chIdx } : state.tabChapters,
        openTabBookIds: state.openTabBookIds.includes(target.bookId) ? state.openTabBookIds : [...state.openTabBookIds, target.bookId],
      }))
      if (hasSpecificCh) {
        persistSession(target.bookId, chIdx)
      }
      if (pushHistory) updateUrl(target.bookId, hasSpecificCh ? chIdx : 0, false, get().activePage)
    },

    closeReader: (pushHistory = true) => {
      set({ isReaderOpen: false })
      if (pushHistory) updateUrl(null, 0, false, get().activePage)
    },

    switchBookTab: (bookId) => {
      const prevActiveBookId = get().activeBookId
      if (prevActiveBookId && prevActiveBookId !== bookId) {
        stopLocalTts(`Switched tab to book ${bookId}`)
      }
      const savedCh = get().tabChapters[bookId]
      const nextCh = savedCh ?? 0
      set((state) => ({
        activeBookId: bookId,
        chapterIndex: nextCh,
        jumpTarget: savedCh !== undefined ? { bookId, chapterIndex: savedCh } : null,
        openTabBookIds: state.openTabBookIds.includes(bookId) ? state.openTabBookIds : [...state.openTabBookIds, bookId],
      }))
      updateUrl(bookId, nextCh, true, get().activePage)
      persistSession(bookId, nextCh)
    },

    closeBookTab: (bookId) => {
      if (get().activeBookId === bookId) {
        stopLocalTts(`Closed tab for active book ${bookId}`)
      }
      set((state) => computeClosedTabState(state, bookId))
    },

    setChapterIndex: (chIdx, replaceHistory = true) => {
      const { activeBookId, chapterIndex, jumpTarget } = get()
      if (chIdx === chapterIndex && !jumpTarget && activeBookId && get().tabChapters[activeBookId] === chIdx) return
      set((state) => ({
        chapterIndex: chIdx,
        jumpTarget: null,
        tabChapters: activeBookId ? { ...state.tabChapters, [activeBookId]: chIdx } : state.tabChapters,
      }))
      if (activeBookId) {
        persistSession(activeBookId, chIdx)
        updateUrl(activeBookId, chIdx, replaceHistory, get().activePage)
      }
    },

    setActivePage: (page) => {
      set({ activePage: page })
      const { activeBookId, chapterIndex, isReaderOpen } = get()
      updateUrl(isReaderOpen ? activeBookId : null, chapterIndex, false, page)
    },

    syncFromBrowserUrl: () => {
      if (typeof window === 'undefined') return
      const params = new URLSearchParams(window.location.search)
      const tabParam = params.get('tab')
      const validPages: Array<'shelf' | 'discovery' | 'search' | 'stats' | 'sources' | 'notes' | 'tts'> = [
        'shelf', 'discovery', 'search', 'stats', 'sources', 'notes', 'tts',
      ]
      const activePage = tabParam && validPages.includes(tabParam as any) ? (tabParam as any) : 'shelf'

      const bookParam = params.get('book')
      const chParam = params.get('ch')
      if (!bookParam) {
        set({ isReaderOpen: false, activePage })
        return
      }
      const ch = chParam ? Math.max(0, parseInt(chParam, 10) || 0) : 0
      set((state) => ({
        isReaderOpen: true,
        activeBookId: bookParam,
        chapterIndex: ch,
        jumpTarget: { bookId: bookParam, chapterIndex: ch },
        openTabBookIds: state.openTabBookIds.includes(bookParam) ? state.openTabBookIds : [...state.openTabBookIds, bookParam],
        activePage,
      }))
      persistSession(bookParam, ch)
    },
  }
})
