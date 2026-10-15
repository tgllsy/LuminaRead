import React from 'react'
import { Search, Zap, ArrowRight } from 'lucide-react'
import { useSidebarSearch } from '../hooks'

interface SearchInBookTabProps {
  bookId: string
  initialQuery?: string
  onSelectChapter: (
    chapterIndex: number,
    paragraphIndex?: number,
    keyword?: string
  ) => void
  onCloseIfOverlay: () => void
  isDark: boolean
}

export const SearchInBookTab: React.FC<SearchInBookTabProps> = ({
  bookId,
  initialQuery = '',
  onSelectChapter,
  onCloseIfOverlay,
  isDark,
}) => {
  const { searchQuery, setSearchQuery, searchResult, runSearch } =
    useSidebarSearch(bookId, initialQuery)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSearchQuery(val)
    void runSearch(val)
  }

  const hasNoResults =
    searchResult &&
    searchResult.chapter_hits.length === 0 &&
    searchResult.highlight_hits.length === 0

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden ${
        isDark ? 'bg-[#141416]' : 'bg-[#f7f8fa]'
      }`}
    >
      <div
        className={`px-4 py-3 border-b space-y-2 ${
          isDark
            ? 'bg-[#1c1c1e] border-white/8'
            : 'bg-white border-slate-200/70'
        }`}
      >
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="搜索全书章节与划线笔记..."
            className={`w-full pl-9 pr-20 py-2 rounded-full border border-transparent text-xs sm:text-[13px] focus:outline-none transition-all ${
              isDark
                ? 'bg-[#2c2c2e] text-slate-100 placeholder:text-slate-500 focus:border-[#1b88ee]/50'
                : 'bg-[#f2f3f5] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#1b88ee]/40'
            }`}
          />
          {searchResult && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full bg-[#1b88ee]/10 text-[#1b88ee] text-[10px] font-mono">
              {searchResult.elapsed_ms} ms
            </span>
          )}
        </div>
        {searchResult && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#1b88ee]" />
              找到 {searchResult.total_matches} 处匹配结果
            </span>
            <span className="font-mono">{searchResult.engine}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {!searchResult ? (
          <div className="py-12 text-center text-xs text-slate-400">
            输入关键词即可快速定位本书所有段落与笔记
          </div>
        ) : hasNoResults ? (
          <div className="py-12 text-center text-xs text-slate-400">
            未找到包含「{searchResult.query}」的段落或笔记
          </div>
        ) : (
          <>
            {searchResult.highlight_hits.map((hl) => (
              <div
                key={`hl-${hl.id}`}
                onClick={() => {
                  onSelectChapter(
                    hl.chapter_index,
                    hl.paragraph_index,
                    searchQuery
                  )
                  onCloseIfOverlay()
                }}
                className={`p-3.5 rounded-2xl border hover:border-[#1b88ee]/50 cursor-pointer transition-all space-y-1 shadow-2xs ${
                  isDark
                    ? 'bg-[#1c1c1e] border-white/8'
                    : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-semibold ${
                      isDark ? 'text-slate-200' : 'text-slate-700'
                    }`}
                  >
                    [笔记] {hl.chapter_title}
                  </span>
                  <span className="text-[#1b88ee] text-[11px] font-medium flex items-center gap-0.5">
                    定位 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <p
                  className={`text-xs font-serif ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}
                >
                  “{hl.selected_text}”
                </p>
                {hl.note && (
                  <p className="text-[11px] text-slate-400">
                    💭 {hl.note}
                  </p>
                )}
              </div>
            ))}
            {searchResult.chapter_hits.map((hit) => (
              <div
                key={hit.id}
                onClick={() => {
                  onSelectChapter(
                    hit.chapter_index,
                    hit.paragraph_index,
                    searchQuery
                  )
                  onCloseIfOverlay()
                }}
                className={`p-3.5 rounded-2xl border hover:border-[#1b88ee]/50 cursor-pointer transition-all space-y-1.5 shadow-2xs ${
                  isDark
                    ? 'bg-[#1c1c1e] border-white/8'
                    : 'bg-white border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-semibold ${
                      isDark ? 'text-slate-200' : 'text-slate-700'
                    }`}
                  >
                    {hit.chapter_title} · 第 {hit.paragraph_index + 1} 段
                  </span>
                  <span className="text-[#1b88ee] text-[11px] font-medium flex items-center gap-0.5">
                    跳转 <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <p
                  className={`text-xs font-serif leading-relaxed ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  <span>{hit.snippet_before}</span>
                  {hit.match_text ? (
                    <mark className="bg-[#1b88ee]/15 text-[#1b88ee] font-semibold px-1 rounded">
                      {hit.match_text}
                    </mark>
                  ) : (
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-[#1b88ee]/10 text-[#1b88ee] text-[10px] font-sans">
                      章节命中
                    </span>
                  )}
                  <span>{hit.snippet_after}</span>
                </p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
