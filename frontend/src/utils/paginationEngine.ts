import type {
  PageSpread,
  PageSliceItem,
  PaginationInput,
  PaginationOutput,
} from '../workers/paginationWorker'
import { computeSpreadsSync } from '../workers/paginationWorker'

let workerInstance: Worker | null = null
let currentReqId = 0
const pendingCallbacks = new Map<number, (spreads: PageSpread[]) => void>()

function getWorker(): Worker | null {
  if (typeof window === 'undefined') return null
  if (!workerInstance && typeof Worker !== 'undefined') {
    try {
      workerInstance = new Worker(
        new URL('../workers/paginationWorker.ts', import.meta.url),
        { type: 'module' }
      )
      workerInstance.onmessage = (e: MessageEvent<PaginationOutput>) => {
        const { reqId, spreads } = e.data
        const cb = pendingCallbacks.get(reqId)
        if (cb) {
          pendingCallbacks.delete(reqId)
          cb(spreads)
        }
      }
      workerInstance.onerror = (err) => {
        console.warn('Pagination Worker encountered an error, falling back to sync:', err)
        workerInstance = null
      }
    } catch (err) {
      console.warn('Unable to initialize Pagination Worker:', err)
      workerInstance = null
    }
  }
  return workerInstance
}

const WORKER_OFFLOAD_PARAGRAPH_THRESHOLD = 24
const INITIAL_PLACEHOLDER_PARAGRAPHS = 12

export function computePaginationSpreads(
  input: Omit<PaginationInput, 'reqId'>,
  onResult?: (spreads: PageSpread[]) => void
): PageSpread[] {
  const worker = getWorker()

  // For short chapters or when no async worker callback is needed, compute once synchronously
  // without posting a duplicate calculation to the Web Worker.
  if (!worker || !onResult || input.paragraphs.length <= WORKER_OFFLOAD_PARAGRAPH_THRESHOLD) {
    return computeSpreadsSync(input)
  }

  // For long chapters, compute only a lightweight initial spread synchronously to prevent
  // layout flicker, and offload the full chapter pagination to the Web Worker.
  const initialPreview = computeSpreadsSync({
    ...input,
    paragraphs: input.paragraphs.slice(0, INITIAL_PLACEHOLDER_PARAGRAPHS),
  })

  currentReqId += 1
  const thisReqId = currentReqId
  pendingCallbacks.set(thisReqId, onResult)

  worker.postMessage({
    ...input,
    reqId: thisReqId,
  })

  return initialPreview
}

export type { PageSpread, PageSliceItem, PaginationInput }
