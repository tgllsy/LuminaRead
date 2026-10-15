import React, { useState, useMemo } from 'react'
import { FileText, Sparkles, MessageSquareQuote, Bookmark, CheckCircle2 } from 'lucide-react'
import type { NotesAndAICenterViewProps, AIConversationItem } from './types'
import { filterHighlights, filterAiConversations, filterBookmarks } from './helpers'
import { useNotesFilter, useNotesHub, useHighlightMutations, useAiMutations } from './hooks'
import {
  NotesHeader,
  NotesFilterBar,
  HighlightCard,
  AiConversationCard,
  BookmarkCard,
  AiWorkbenchModal,
  CreateNoteModal,
} from './components'
import { notesApi } from './api'

function useNotesExportAndFollowUp(
  selectedBookId: string,
  books: NotesAndAICenterViewProps['books'],
  askAi: ReturnType<typeof useAiMutations>['askAi'],
  showToast: (msg: string) => void
) {
  const handleExportMarkdown = async () => {
    if (books.length === 0) return showToast('书架尚无图书可导出')
    if (selectedBookId === 'all') {
      showToast('正在合并导出全馆所有书籍笔记...')
      try {
        const results = await Promise.all(books.map((b) => notesApi.exportMarkdown(b.id).catch(() => '')))
        const combined = results.filter(Boolean).join('\n\n---\n\n')
        if (!combined.trim()) return showToast('全馆暂无已划线或笔记可导出')
        const blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `阅境全馆笔记总汇.md`
        a.click()
        URL.revokeObjectURL(url)
        showToast('全馆 Markdown 笔记已成功合并导出下载')
      } catch {
        showToast('全馆笔记导出失败')
      }
      return
    }

    const targetId = selectedBookId
    try {
      const md = await notesApi.exportMarkdown(targetId)
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `阅境笔记_${targetId}.md`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Markdown 笔记已成功导出下载')
    } catch {
      showToast('导出 Markdown 失败')
    }
  }

  const handleExportLifeOs = async () => {
    if (books.length === 0) return showToast('书架尚无图书可导出')
    if (selectedBookId === 'all') {
      showToast('正在批量同步全馆笔记至 LifeOS...')
      try {
        await Promise.all(books.map((b) => notesApi.exportLifeOs(b.id).catch(() => {})))
        showToast('已将全馆书籍笔记同步至 LifeOS 知识库')
      } catch {
        showToast('LifeOS 全馆同步失败')
      }
      return
    }

    const targetId = selectedBookId
    try {
      await notesApi.exportLifeOs(targetId)
      showToast('已导出至 LifeOS 知识库结构')
    } catch {
      showToast('导出 LifeOS 失败')
    }
  }

  const handleFollowUpAsk = async (parentConv: AIConversationItem, followUp: string) => {
    await askAi({
      bookId: parentConv.book_id,
      chapterIndex: parentConv.chapter_index,
      chapterTitle: parentConv.chapter_title || '',
      selectedText: `上轮结论：${(parentConv.answer_content || '').slice(0, 100)}...`,
      mode: parentConv.mode,
      question: followUp,
    })
    showToast('已完成追问研讨并收录')
  }

  return { handleExportMarkdown, handleExportLifeOs, handleFollowUpAsk }
}

export const NotesAndAICenterView: React.FC<NotesAndAICenterViewProps> = ({
  books, onOpenBook, onBooksChanged, initialSubTab = 'all', initialBookId = 'all',
}) => {
  const [showAiWorkbench, setShowAiWorkbench] = useState(false)
  const [showCreateNoteModal, setShowCreateNoteModal] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3000) }

  const filter = useNotesFilter(initialSubTab, initialBookId)
  const { hubData, loading, bookTocMap, fetchHubData, loadTocForBook } = useNotesHub()
  const hlMut = useHighlightMutations(fetchHubData, onBooksChanged)
  const aiMut = useAiMutations(fetchHubData, onBooksChanged)
  const { handleExportMarkdown, handleExportLifeOs, handleFollowUpAsk } = useNotesExportAndFollowUp(
    filter.selectedBookId, books, aiMut.askAi, showToast
  )

  const filteredHighlights = useMemo(() => filterHighlights(hubData?.highlights || [], filter.filterState), [hubData?.highlights, filter.filterState])
  const filteredAiConversations = useMemo(() => filterAiConversations(hubData?.ai_conversations || [], filter.filterState), [hubData?.ai_conversations, filter.filterState])
  const filteredBookmarks = useMemo(() => filterBookmarks(hubData?.bookmarks || [], filter.filterState), [hubData?.bookmarks, filter.filterState])
  const selectedBookTitle = useMemo(() => books.find((b) => b.id === filter.selectedBookId)?.title, [books, filter.selectedBookId])

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none">
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>{toastMessage}</span>
        </div>
      )}

      <NotesHeader
        stats={hubData?.stats} selectedBookTitle={selectedBookTitle}
        onOpenCreateNote={() => setShowCreateNoteModal(true)} onOpenAiWorkbench={() => setShowAiWorkbench(true)}
        onExportMarkdown={handleExportMarkdown} onExportLifeOs={handleExportLifeOs}
      />

      <NotesFilterBar
        activeSubTab={filter.activeSubTab} selectedBookId={filter.selectedBookId} searchQuery={filter.searchQuery}
        colorFilter={filter.colorFilter} styleFilter={filter.styleFilter} aiModeFilter={filter.aiModeFilter}
        books={books} onSelectSubTab={filter.setActiveSubTab} onSelectBookId={filter.setSelectedBookId}
        onSearchChange={filter.setSearchQuery} onColorFilterChange={filter.setColorFilter}
        onStyleFilterChange={filter.setStyleFilter} onAiModeFilterChange={filter.setAiModeFilter}
      />

      <NotesAssetList
        loading={loading && !hubData} activeSubTab={filter.activeSubTab}
        filteredHighlights={filteredHighlights} filteredAiConversations={filteredAiConversations} filteredBookmarks={filteredBookmarks}
        onOpenBook={onOpenBook} onSelectBook={filter.setSelectedBookId} hlMut={hlMut} aiMut={aiMut} onFollowUpAsk={handleFollowUpAsk}
      />

      {showAiWorkbench && (
        <AiWorkbenchModal
          books={books} initialBookId={filter.selectedBookId} bookTocMap={bookTocMap} onLoadToc={loadTocForBook}
          onClose={() => setShowAiWorkbench(false)} onAskAi={async (p) => { await aiMut.askAi(p); showToast('AI 研讨已收录完成') }}
        />
      )}

      {showCreateNoteModal && (
        <CreateNoteModal
          books={books} initialBookId={filter.selectedBookId} bookTocMap={bookTocMap} onLoadToc={loadTocForBook}
          onClose={() => setShowCreateNoteModal(false)} onCreateNote={async (p) => { await hlMut.createNote(p); showToast('读书笔记已成功保存') }}
        />
      )}
    </div>
  )
}

const NotesAssetList: React.FC<{
  loading: boolean
  activeSubTab: ReturnType<typeof useNotesFilter>['activeSubTab']
  filteredHighlights: ReturnType<typeof filterHighlights>
  filteredAiConversations: ReturnType<typeof filterAiConversations>
  filteredBookmarks: ReturnType<typeof filterBookmarks>
  onOpenBook: NotesAndAICenterViewProps['onOpenBook']
  onSelectBook: (bookId: string) => void
  hlMut: ReturnType<typeof useHighlightMutations>
  aiMut: ReturnType<typeof useAiMutations>
  onFollowUpAsk: (parentConv: AIConversationItem, followUp: string) => Promise<void>
}> = ({
  loading, activeSubTab, filteredHighlights, filteredAiConversations, filteredBookmarks,
  onOpenBook, onSelectBook, hlMut, aiMut, onFollowUpAsk,
}) => {
  const hasAnyItems =
    filteredHighlights.length > 0 || filteredAiConversations.length > 0 || filteredBookmarks.length > 0

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">正在同步全馆笔记与研讨资产...</div>
  }
  if (!hasAnyItems) {
    return (
      <div className="py-24 text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700">暂无匹配的知识资产</h4>
        <p className="text-xs text-slate-400 max-w-xs mx-auto">
          你可以在阅读中选中段落划线、记录随想，或者直接向 AI 发起全书深度研讨。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {(activeSubTab === 'all' || activeSubTab === 'ai') &&
        filteredAiConversations.map((conv) => (
          <AiConversationCard
            key={conv.id}
            item={conv}
            onTogglePin={aiMut.togglePinAi}
            onConvertToNote={aiMut.convertAiToNote}
            onDelete={aiMut.deleteAi}
            onFollowUpAsk={onFollowUpAsk}
            onSelectBook={onSelectBook}
          />
        ))}

      {(activeSubTab === 'all' || activeSubTab === 'notes' || activeSubTab === 'highlights') &&
        filteredHighlights.map((hl) => (
          <HighlightCard
            key={hl.id}
            item={hl}
            onOpenBook={onOpenBook}
            onSaveEdit={hlMut.editHighlight}
            onDelete={hlMut.deleteHighlight}
            onSelectBook={onSelectBook}
          />
        ))}

      {(activeSubTab === 'all' || activeSubTab === 'bookmarks') &&
        filteredBookmarks.map((bm) => (
          <BookmarkCard
            key={bm.id}
            item={bm}
            onOpenBook={onOpenBook}
            onDelete={hlMut.deleteBookmark}
            onSelectBook={onSelectBook}
          />
        ))}
    </div>
  )
}
