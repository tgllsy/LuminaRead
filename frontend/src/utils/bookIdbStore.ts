import type { BookFullContent } from '../types'

const IDB_NAME = 'luminaread_offline_cache'
const IDB_STORE = 'books_content'

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null)
  }
  return new Promise((resolve) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true
        resolve(null)
      }
    }, 350)
    const finish = (db: IDBDatabase | null) => {
      if (!settled) {
        settled = true
        window.clearTimeout(timer)
        resolve(db)
      }
    }
    try {
      const req = window.indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'bookId' })
        }
      }
      req.onsuccess = () => finish(req.result)
      req.onerror = () => finish(null)
      req.onblocked = () => finish(null)
    } catch {
      finish(null)
    }
  })
}

let idbPromise: Promise<IDBDatabase | null> | null = null

export function getIdb(): Promise<IDBDatabase | null> {
  if (!idbPromise) {
    idbPromise = openIdb()
  }
  return idbPromise
}

export function isValidBookContent(d: unknown, bookId: string): d is BookFullContent {
  if (!d || typeof d !== 'object') return false
  const obj = d as Record<string, unknown>
  const book = obj.book as { id?: string } | undefined
  return Boolean(
    book &&
    book.id === bookId &&
    Array.isArray(obj.chapters) &&
    obj.chapters.length > 0
  )
}

export function saveOfflineToIdb(bookId: string, content: BookFullContent): void {
  getIdb().then((db) => {
    if (!db) return
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put({
        bookId,
        content,
        cachedAt: Date.now(),
      })
    } catch {
      // ignore quota errors
    }
  })
}

export function deleteOfflineFromIdb(bookId: string): void {
  getIdb().then((db) => {
    if (!db) return
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(bookId)
    } catch {
      // ignore errors
    }
  })
}

export async function loadOfflineFromIdb(bookId: string): Promise<BookFullContent | null> {
  const db = await Promise.race([
    getIdb(),
    new Promise<null>((resolve) => {
      if (typeof window !== 'undefined') {
        window.setTimeout(() => resolve(null), 180)
      } else {
        resolve(null)
      }
    }),
  ])
  if (!db) return null

  return new Promise<BookFullContent | null>((resolve) => {
    let settled = false
    const timer =
      typeof window !== 'undefined'
        ? window.setTimeout(() => {
            if (!settled) {
              settled = true
              resolve(null)
            }
          }, 220)
        : null

    const finish = (result: BookFullContent | null) => {
      if (!settled) {
        settled = true
        if (timer !== null) window.clearTimeout(timer)
        resolve(result)
      }
    }

    try {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(bookId)
      req.onsuccess = () => {
        const content = req.result?.content
        if (isValidBookContent(content, bookId)) {
          finish(content)
        } else {
          try {
            const delTx = db.transaction(IDB_STORE, 'readwrite')
            delTx.objectStore(IDB_STORE).delete(bookId)
          } catch {
            // ignore
          }
          finish(null)
        }
      }
      req.onerror = () => finish(null)
    } catch {
      finish(null)
    }
  })
}
