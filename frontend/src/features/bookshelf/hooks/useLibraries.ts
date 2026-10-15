import { useState, useCallback, useEffect } from 'react'
import type { ReadingLibrary, LibraryFormData } from '../types'
import { bookshelfApi } from '../api'

export function useLibraries(booksLength: number, onBooksChanged: () => void) {
  const [libraries, setLibraries] = useState<ReadingLibrary[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchLibraries = useCallback(async () => {
    try {
      const list = await bookshelfApi.fetchLibraries()
      setLibraries(list)
    } catch {
      // offline / ignore
    }
  }, [])

  useEffect(() => {
    fetchLibraries()
  }, [booksLength, fetchLibraries])

  const saveLibrary = useCallback(
    async (formData: LibraryFormData) => {
      setIsSubmitting(true)
      try {
        const saved = formData.id
          ? await bookshelfApi.updateLibrary(formData.id, formData)
          : await bookshelfApi.createLibrary(formData)
        await fetchLibraries()
        onBooksChanged()
        return saved
      } finally {
        setIsSubmitting(false)
      }
    },
    [fetchLibraries, onBooksChanged]
  )

  const removeLibrary = useCallback(
    async (lib: ReadingLibrary) => {
      if (lib.is_default) return
      if (!window.confirm(`确定删除阅读库「${lib.name}」吗？（库内藏书将自动移回默认书库）`)) return
      await bookshelfApi.deleteLibrary(lib.id)
      await fetchLibraries()
      onBooksChanged()
    },
    [fetchLibraries, onBooksChanged]
  )

  return {
    libraries,
    isSubmitting,
    fetchLibraries,
    saveLibrary,
    removeLibrary,
  }
}
