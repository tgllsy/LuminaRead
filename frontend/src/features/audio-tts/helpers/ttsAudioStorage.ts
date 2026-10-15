const CACHE_NAME = 'lumina-tts-cache-v1'
const IDB_NAME = 'lumina_tts_cache_db'
const IDB_STORE = 'blobs'

let idbInstance: IDBDatabase | null = null

function openIdb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return Promise.resolve(null)
  if (idbInstance) return Promise.resolve(idbInstance)
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE)
        }
      }
      req.onsuccess = () => {
        idbInstance = req.result
        idbInstance.onclose = () => { idbInstance = null }
        idbInstance.onversionchange = () => {
          idbInstance?.close()
          idbInstance = null
        }
        resolve(idbInstance)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export async function getCachedAudioBlob(cacheKey: string): Promise<Blob | null> {
  if (typeof window === 'undefined') return null

  // 1. Try Cache API (HTTPS / localhost)
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME)
      const resp = await cache.match(`/tts-cache/${encodeURIComponent(cacheKey)}`)
      if (resp) return await resp.blob()
    } catch {
      // ignore
    }
  }

  // 2. Try IndexedDB fallback (works on LAN HTTP origins like 192.168.x.x)
  try {
    const db = await openIdb()
    if (!db) return null
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(cacheKey)
      req.onsuccess = () => resolve((req.result as Blob) || null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

export async function putCachedAudioBlob(cacheKey: string, blob: Blob): Promise<void> {
  if (typeof window === 'undefined') return

  // 1. Prefer Cache API when available; return immediately on success to avoid 2x disk usage
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(
        `/tts-cache/${encodeURIComponent(cacheKey)}`,
        new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } })
      )
      return
    } catch {
      // Fall through to IndexedDB if Cache API fails (e.g. insecure LAN origin or quota error)
    }
  }

  // 2. Fallback to IndexedDB only when Cache API is unavailable
  try {
    const db = await openIdb()
    if (!db) return
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(blob, cacheKey)
  } catch {
    // ignore
  }
}
