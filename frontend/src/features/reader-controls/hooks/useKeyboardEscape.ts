import { useEffect } from 'react'

export function useKeyboardEscape(
  isOpen: boolean,
  onEscape: () => void,
  showFontDrawer?: boolean,
  onCloseFontDrawer?: () => void
): void {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showFontDrawer && onCloseFontDrawer) {
          onCloseFontDrawer()
        } else {
          onEscape()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, showFontDrawer, onEscape, onCloseFontDrawer])
}
