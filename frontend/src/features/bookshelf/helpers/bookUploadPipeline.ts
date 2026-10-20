import type { BookSummary } from '../types'
import { bookshelfApi } from '../api'

export interface UploadPipelineOptions {
  files: File[]
  defaultCategory: string
  defaultLibId: string
  chunkSize?: number
  concurrency?: number
  onBookCreated: (book: BookSummary) => void
  onChunkProgress: (book: BookSummary) => void
  onError: (filename: string, message: string) => void
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 600): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)))
      }
    }
  }
  throw lastErr
}

async function uploadSingleFile(
  file: File,
  category: string,
  libraryId: string,
  chunkSize: number,
  onBookCreated: (book: BookSummary) => void,
  onChunkProgress: (book: BookSummary) => void
): Promise<void> {
  const initialBook = await withRetry(() =>
    bookshelfApi.initBookUpload({
      filename: file.name,
      fileSize: file.size,
      category,
      library_id: libraryId,
    })
  )
  onBookCreated(initialBook)

  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize))
  let allChunksUploaded = false
  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const blob = file.slice(start, Math.min(file.size, start + chunkSize))
      const updated = await withRetry(() =>
        bookshelfApi.uploadBookChunk(initialBook.id, i, totalChunks, blob)
      )
      const pct = Math.min(80, Math.round(((i + 1) / totalChunks) * 80))
      onChunkProgress(
        updated || {
          ...initialBook,
          import_progress: pct,
          import_step: `正在上传文件 (${pct}%)...`,
        }
      )
    }

    allChunksUploaded = true
    onChunkProgress({
      ...initialBook,
      import_progress: 85,
      import_step: '正在提取章节与封面...',
    })

    const completedBook = await withRetry(() => bookshelfApi.completeBookUpload(initialBook.id), 3, 1000)
    let currentBook = completedBook
    if (currentBook) {
      onChunkProgress(currentBook)
    }

    // Actively poll until background extraction is finished
    for (let p = 0; p < 25; p++) {
      if (!currentBook || currentBook.status === 'importing') {
        await new Promise((r) => setTimeout(r, 800))
        const poll = await bookshelfApi.fetchBookById(initialBook.id).catch(() => null)
        if (poll) {
          currentBook = poll
          onChunkProgress(poll)
          if (poll.status !== 'importing') break
        }
      } else {
        break
      }
    }
  } catch (err) {
    if (allChunksUploaded) {
      onChunkProgress({
        ...initialBook,
        status: 'importing',
        import_progress: 88,
        import_step: '正在后台解析章节与索引...',
      })
      return
    }
    const msg = err instanceof Error ? err.message : '上传或解析失败'
    onChunkProgress({
      ...initialBook,
      status: 'error',
      import_error: msg,
      import_step: '导入失败',
    })
    await bookshelfApi.failBookUpload(initialBook.id, msg).catch(() => {})
    throw err
  }
}

export async function uploadFilesWithWorkers(options: UploadPipelineOptions): Promise<void> {
  const {
    files,
    defaultCategory,
    defaultLibId,
    chunkSize = 4 * 1024 * 1024,
    concurrency = 2,
    onBookCreated,
    onChunkProgress,
    onError,
  } = options

  const queue = [...files]

  const worker = async () => {
    while (queue.length > 0) {
      const file = queue.shift()
      if (!file) break
      try {
        await uploadSingleFile(
          file,
          defaultCategory,
          defaultLibId,
          chunkSize,
          onBookCreated,
          onChunkProgress
        )
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '上传失败'
        onError(file.name, msg)
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker())
  await Promise.all(workers)
}
