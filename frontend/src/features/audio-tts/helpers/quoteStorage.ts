export interface SavedTtsQuote {
  id: string
  text: string
  bookTitle: string
  chapterTitle?: string
  createdAt: number
}

const QUOTES_STORAGE_KEY = 'luminaread_tts_saved_quotes'

export function saveTtsQuote(
  text: string,
  bookTitle: string,
  chapterTitle?: string
): SavedTtsQuote {
  const quote: SavedTtsQuote = {
    id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: text.trim(),
    bookTitle,
    chapterTitle,
    createdAt: Date.now(),
  }

  try {
    const raw = localStorage.getItem(QUOTES_STORAGE_KEY)
    const list: SavedTtsQuote[] = raw ? JSON.parse(raw) : []
    const updated = [quote, ...list.filter((q) => q.text !== quote.text)].slice(0, 100)
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }

  return quote
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fallback
  }
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    return successful
  } catch {
    return false
  }
}
