import React, { useState } from 'react'
import { Maximize2, GitFork } from 'lucide-react'
import type { MindmapLayout } from '../types'
import { COLOR_HEX } from '../constants'
import { MindmapFullscreenModal } from './MindmapFullscreenModal'

interface MindmapViewProps {
  bookTitle: string
  layout: MindmapLayout
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onSelectChapter: (chapterIndex: number, paragraphIndex?: number) => void
  onCloseIfOverlay: () => void
  isDark: boolean
}

export const MindmapView: React.FC<MindmapViewProps> = ({
  bookTitle,
  layout,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSelectChapter,
  onCloseIfOverlay,
  isDark,
}) => {
  const [showFullscreen, setShowFullscreen] = useState(false)
  const { nodes, totalHeight, rootY } = layout

  return (
    <div
      className={`flex-1 overflow-auto p-4 flex flex-col ${
        isDark ? 'bg-[#141416]' : 'bg-[#f7f8fa]'
      }`}
    >
      <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between gap-2">
        <span>点击笔记节点直达正文对应位置</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowFullscreen(true)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors ${
              isDark
                ? 'bg-[#1b88ee]/20 text-[#1b88ee] hover:bg-[#1b88ee]/30'
                : 'bg-[#1b88ee]/12 text-[#1b88ee] hover:bg-[#1b88ee]/20'
            }`}
            title="全屏大画布浏览思维导图"
          >
            <Maximize2 className="w-3 h-3" />
            <span>全屏放大</span>
          </button>
          <div className="flex items-center bg-current/5 rounded-full p-0.5">
            <button
              onClick={onZoomOut}
              className={`px-1.5 py-0.5 rounded-full font-mono text-[11px] ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              -
            </button>
            <button
              onClick={onResetZoom}
              className={`px-1.5 py-0.5 rounded-full font-mono text-[11px] ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={onZoomIn}
              className={`px-1.5 py-0.5 rounded-full font-mono text-[11px] ${
                isDark ? 'text-slate-200' : 'text-slate-700'
              }`}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="flex-1 rounded-2xl border border-dashed border-current/15 flex flex-col items-center justify-center p-6 text-center select-none gap-2.5">
          <div className="w-10 h-10 rounded-full bg-[#1b88ee]/10 text-[#1b88ee] flex items-center justify-center">
            <GitFork className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold opacity-85">全书暂无划线与随想笔记</div>
          <div className="text-xs opacity-55 max-w-[240px] leading-relaxed">
            在正文中选中文段划线，即可在此自动生成结构化笔记思维导图。
          </div>
        </div>
      ) : (
        <div
          className={`flex-1 overflow-auto rounded-2xl border ${
            isDark ? 'border-white/8 bg-[#1c1c1e]' : 'border-slate-200/80 bg-white'
          }`}
        >
        <svg
          viewBox={`0 0 780 ${totalHeight}`}
          style={{
            width: `${Math.round(780 * zoom)}px`,
            minWidth: '100%',
            height: `${Math.round(totalHeight * zoom)}px`,
          }}
        >
          {/* Root Book Node */}
          <g transform={`translate(24, ${rootY})`}>
            <rect
              x={0}
              y={0}
              width={150}
              height={52}
              rx={14}
              fill="#1b88ee"
            />
            <text
              x={75}
              y={30}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="12"
              fontWeight="bold"
            >
              《{bookTitle.slice(0, 8)}》
            </text>
          </g>

          {nodes.map(({ ch, cy, leaves }) => (
            <g key={ch.id}>
              {/* Curve from Root to Chapter */}
              <path
                d={`M 174 ${rootY + 26} C 215 ${rootY + 26}, 215 ${
                  cy + 20
                }, 250 ${cy + 20}`}
                fill="none"
                stroke={isDark ? '#475569' : '#cbd5e1'}
                strokeWidth="1.8"
              />
              <g
                transform={`translate(250, ${cy})`}
                className="cursor-pointer"
                onClick={() => {
                  onSelectChapter(ch.index)
                  onCloseIfOverlay()
                }}
              >
                <rect
                  x={0}
                  y={0}
                  width={185}
                  height={40}
                  rx={10}
                  fill={isDark ? '#25262b' : '#f7f9fc'}
                  stroke="#1b88ee"
                  strokeWidth="1.4"
                />
                <text
                  x={12}
                  y={24}
                  fill={isDark ? '#e2e8f0' : '#1e293b'}
                  fontSize="11"
                  fontWeight="600"
                >
                  {ch.title.slice(0, 13)}
                </text>
              </g>

              {/* Leaf Highlight Nodes */}
              {leaves.map(({ hl, hy }) => {
                const colorHex = COLOR_HEX[hl.color] || '#f59e0b'
                return (
                  <g
                    key={hl.id}
                    className="cursor-pointer"
                    onClick={() => {
                      onSelectChapter(hl.chapter_index, hl.paragraph_index)
                      onCloseIfOverlay()
                    }}
                  >
                    <path
                      d={`M 435 ${cy + 20} C 465 ${cy + 20}, 465 ${
                        hy + 16
                      }, 495 ${hy + 16}`}
                      fill="none"
                      stroke={colorHex}
                      strokeWidth="1.5"
                    />
                    <rect
                      x={495}
                      y={hy}
                      width={265}
                      height={hl.note ? 36 : 28}
                      rx={8}
                      fill={isDark ? '#25262b' : '#ffffff'}
                      stroke={colorHex}
                      strokeWidth="1.4"
                    />
                    <text
                      x={505}
                      y={hy + 14}
                      fill={isDark ? '#f8fafc' : '#334155'}
                      fontSize="10"
                    >
                      {hl.selected_text.slice(0, 20)}…
                    </text>
                    {hl.note && (
                      <text
                        x={505}
                        y={hy + 28}
                        fill="#d97706"
                        fontSize="9"
                      >
                        💡 {hl.note.slice(0, 22)}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          ))}
        </svg>
      </div>
      )}

      {showFullscreen && (
        <MindmapFullscreenModal
          isOpen={showFullscreen}
          bookTitle={bookTitle}
          layout={layout}
          onClose={() => setShowFullscreen(false)}
          onSelectChapter={onSelectChapter}
          isDark={isDark}
        />
      )}
    </div>
  )
}
