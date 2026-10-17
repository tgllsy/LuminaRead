import React from 'react'
import { ArrowLeft, BookmarkPlus, Languages, Search, Highlighter, X, Headphones } from 'lucide-react'
import type { BookSummary, ReaderTypography, PdfMode } from '../types'
import { getEffectiveThemeStyle } from '../constants'
import { useTypographyStore } from '../../../stores/typographyStore'
import { HeaderTtsIsland } from '../../../app/components/HeaderTtsIsland'

interface ReaderTopNavbarProps {
  book: BookSummary
  chapterTitle: string
  chapterIndex: number
  totalChapters: number
  progressPercent: number
  typography: ReaderTypography
  openTabBooks: BookSummary[]
  onSwitchBookTab: (bookId: string) => void
  onCloseBookTab?: (bookId: string) => void
  onBackToShelf: () => void
  onToggleBilingual: () => void
  bilingualLoading: boolean
  onAddBookmark: () => void
  pdfMode: PdfMode
  onTogglePdfMode: () => void
  immersiveHudVisible: boolean
  showTypography: boolean
  onOpenImmersiveHud: () => void
  onOpenSearch: () => void
  onOpenNotes: () => void
  hasHighlights: boolean
  readingEstimateText?: string
  onOpenTTS?: () => void
}

export const ReaderTopNavbar: React.FC<ReaderTopNavbarProps> = (props) => {
  const themeStyle = getEffectiveThemeStyle(props.typography)
  const isDark = props.typography.theme === 'dark'
  const toggleChineseVariant = useTypographyStore((s) => s.toggleChineseVariant)
  const handleToggleChinese = () => toggleChineseVariant(`${props.book.title}${props.chapterTitle}`)

  return (
    <>
      <DesktopNavbar {...props} headerClass={themeStyle.header} onToggleChinese={handleToggleChinese} />

      <div
        onClick={props.onOpenImmersiveHud}
        className={`lg:hidden sticky top-0 z-20 px-4 py-1.5 flex items-center justify-between text-[11px] cursor-pointer select-none transition-opacity ${
          props.immersiveHudVisible || props.showTypography ? 'opacity-0 pointer-events-none' : 'opacity-55 hover:opacity-90'
        } ${themeStyle.subtext}`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          <button
            onClick={(e) => {
              e.stopPropagation()
              props.onBackToShelf()
            }}
            className="hover:opacity-100 flex items-center gap-1 shrink-0 font-medium"
            title="返回书架"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>书架</span>
          </button>
          <span className="opacity-40">·</span>
          <span className="truncate">{props.chapterTitle}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 font-mono">
          <span>{props.chapterIndex + 1}/{props.totalChapters} · {props.progressPercent}%</span>
          {props.readingEstimateText && (
            <span className="hidden sm:inline font-sans text-[10px] opacity-75">
              · {props.readingEstimateText}
            </span>
          )}
        </div>
      </div>

      <MobileFloatingNavbar {...props} isDark={isDark} onToggleChinese={handleToggleChinese} />
    </>
  )
}

const DesktopNavbar: React.FC<ReaderTopNavbarProps & { headerClass: string; onToggleChinese: () => void }> = ({
  book, chapterTitle, chapterIndex, totalChapters, progressPercent,
  openTabBooks, onSwitchBookTab, onCloseBookTab, onBackToShelf,
  onAddBookmark, pdfMode, onTogglePdfMode, headerClass, readingEstimateText,
}) => {
  return (
    <header className={`hidden lg:flex sticky top-0 z-30 border-b backdrop-blur-md h-12 shrink-0 items-center justify-between px-6 xl:px-10 transition-colors ${headerClass}`}>
      <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBackToShelf} className="px-2.5 py-1 -ml-2 rounded-full hover:bg-current/5 flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-colors cursor-pointer" title="返回书架">
            <ArrowLeft className="w-4 h-4 stroke-[2]" /><span>书架</span>
          </button>
          <span className="opacity-25">|</span>
          <span className="text-sm font-bold truncate max-w-[240px]">{book.title}</span>
          <span className="text-xs opacity-60 truncate max-w-[260px]">· {chapterTitle}</span>
          <OpenTabsBar currentBookId={book.id} openTabBooks={openTabBooks} onSwitchBookTab={onSwitchBookTab} onCloseBookTab={onCloseBookTab} />
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {book.format === 'pdf' && (
            <button
              onClick={onTogglePdfMode}
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                pdfMode === 'page_canvas'
                  ? 'bg-[#1b88ee] text-white'
                  : pdfMode === 'text_only'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-current/5 hover:bg-current/10'
              }`}
              title="切换 PDF 模式：图文并排 / 原版影印 / 纯文本"
            >
              {pdfMode === 'hybrid' ? '图文并排' : pdfMode === 'page_canvas' ? '原版影印' : '纯文本'}
            </button>
          )}
          <button onClick={onAddBookmark} className="p-1.5 rounded-full hover:bg-current/5 transition-colors cursor-pointer" title="添加当前页书签">
            <BookmarkPlus className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-mono opacity-65 pl-1">
            <span>{chapterIndex + 1}/{totalChapters}章 · {progressPercent}%</span>
            {readingEstimateText && <><span className="opacity-30">|</span><span className="font-sans text-[11px] opacity-75">{readingEstimateText}</span></>}
          </div>
        </div>
      </div>
    </header>
  )
}

const OpenTabsBar: React.FC<{
  currentBookId: string
  openTabBooks: BookSummary[]
  onSwitchBookTab: (bookId: string) => void
  onCloseBookTab?: (bookId: string) => void
}> = ({ currentBookId, openTabBooks, onSwitchBookTab, onCloseBookTab }) => {
  if (openTabBooks.length <= 1) return null
  return (
    <div className="flex items-center gap-1 ml-2 pl-2 border-l border-current/10 overflow-x-auto no-scrollbar">
      {openTabBooks.filter((tb) => tb.id !== currentBookId).slice(0, 3).map((tb) => (
        <div key={tb.id} className="inline-flex items-center rounded-full bg-current/5 hover:bg-current/10 transition-colors">
          <button
            type="button"
            onClick={() => onSwitchBookTab(tb.id)}
            className="pl-2.5 pr-1 py-0.5 text-[11px] truncate max-w-[110px]"
            title={`切换至《${tb.title}》`}
          >
            {tb.title}
          </button>
          {onCloseBookTab && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onCloseBookTab(tb.id)
              }}
              className="pr-2 pl-0.5 py-0.5 opacity-50 hover:opacity-100 transition-opacity"
              title={`关闭《${tb.title}》标签`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

const MobileFloatingNavbar: React.FC<ReaderTopNavbarProps & { isDark: boolean; onToggleChinese: () => void }> = ({
  book, typography, onBackToShelf, onToggleBilingual, bilingualLoading,
  onAddBookmark, pdfMode, onTogglePdfMode, immersiveHudVisible, showTypography,
  onOpenSearch, onOpenNotes, hasHighlights, readingEstimateText, isDark, onToggleChinese, onOpenTTS,
}) => {
  const btnCls = isDark
    ? 'bg-[#2c2c2e] text-[#ebebf5] hover:bg-[#3a3a3c]'
    : 'bg-[#f2f3f5] text-[#4e5358] hover:text-[#1e1f22]'
  const variant = typography.chineseVariant
  const isVariantActive = Boolean(variant && variant !== 'original')
  return (
    <header
      data-no-hud-toggle="true"
      onClick={(e) => e.stopPropagation()}
      className={`lg:hidden fixed top-0 inset-x-0 z-50 border-b backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] pt-[env(safe-area-inset-top,0px)] transition-all duration-200 ${
        immersiveHudVisible || showTypography ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-full opacity-0 pointer-events-none'
      } ${isDark ? 'bg-[#1c1c1e]/95 border-white/[0.08] text-[#f2f2f7]' : 'bg-white/95 border-black/[0.06] text-[#1e1f22]'}`}
    >
      <div className="max-w-4xl mx-auto px-4 h-13 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={onBackToShelf}
            className={`w-8 h-8 -ml-1 rounded-full flex items-center justify-center shrink-0 transition-colors ${btnCls}`}
            title="返回书架"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
          </button>
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] font-bold truncate">{book.title}</span>
            {readingEstimateText && (
              <span className="text-[10px] opacity-60 font-sans truncate">{readingEstimateText}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {book.format === 'pdf' && (
            <button
              onClick={onTogglePdfMode}
              className={`px-2.5 py-1 rounded-full text-xs font-medium mr-0.5 ${
                pdfMode === 'page_canvas'
                  ? 'bg-[#1b88ee] text-white'
                  : pdfMode === 'text_only'
                  ? 'bg-emerald-600 text-white'
                  : btnCls
              }`}
              title="切换 PDF 模式"
            >
              {pdfMode === 'hybrid' ? '并排' : pdfMode === 'page_canvas' ? '原版' : '文本'}
            </button>
          )}
          <button
            type="button"
            onClick={onToggleChinese}
            className={`h-8 px-2.5 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              isVariantActive ? 'text-white bg-[#1b88ee]' : btnCls
            }`}
            title="繁体与简体中文互换"
          >
            {variant === 'simplified' ? '简' : variant === 'traditional' ? '繁' : '繁⇄简'}
          </button>
          <button onClick={onOpenSearch} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${btnCls}`} title="全文搜索">
            <Search className="w-4 h-4 stroke-[1.9]" />
          </button>
          <button
            onClick={onToggleBilingual}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              typography.bilingualMode ? 'text-white bg-[#1b88ee]' : btnCls
            }`}
            title={bilingualLoading ? '双语翻译中...' : '双语对照'}
          >
            <Languages className="w-4 h-4 stroke-[1.9]" />
          </button>
          <button
            type="button"
            onClick={onOpenTTS}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${btnCls}`}
            title="听书伴读"
          >
            <Headphones className="w-4 h-4 stroke-[1.9]" />
          </button>
          <button onClick={onAddBookmark} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${btnCls}`} title="添加书签">
            <BookmarkPlus className="w-4 h-4 stroke-[1.9]" />
          </button>
          <button onClick={onOpenNotes} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors relative ${btnCls}`} title="查看划线与想法">
            <Highlighter className="w-4 h-4 stroke-[1.9]" />
            {hasHighlights && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#1b88ee]" />}
          </button>
        </div>
      </div>
    </header>
  )
}

