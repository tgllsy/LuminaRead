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

async function uploadSingleFile(
  file: File,
  category: string,
  libraryId: string,
  chunkSize: number,
  onBookCreated: (book: BookSummary) => void,
  onChunkProgress: (book: BookSummary) => void
): Promise<void> {
  const initialBook = await bookshelfApi.initBookUpload({
    filename: file.name,
    fileSize: file.size,
    category,
    library_id: libraryId,
  })
  onBookCreated(initialBook)

  const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize))
  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const blob = file.slice(start, Math.min(file.size, start + chunkSize))
      const updated = await bookshelfApi.uploadBookChunk(initialBook.id, i, totalChunks, blob)
      const pct = Math.min(80, Math.round(((i + 1) / totalChunks) * 80))
      onChunkProgress(
        updated || {
          ...initialBook,
          import_progress: pct,
          import_step: `正在上传文件 (${pct}%)...`,
        }
      )
    }

    onChunkProgress({
      ...initialBook,
      import_progress: 85,
      import_step: '正在提取章节与封面...',
    })

    const completedBook = await bookshelfApi.completeBookUpload(initialBook.id)
    if (completedBook) {
      onChunkProgress(completedBook)
    }
  } catch (err) {
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
