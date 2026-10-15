import React, { useState, useRef, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCcw, Highlighter } from 'lucide-react'
import type { MindmapLayout } from '../types'
import { COLOR_HEX } from '../constants'

interface MindmapFullscreenModalProps {
  isOpen: boolean
  bookTitle: string
  layout: MindmapLayout
  onClose: () => void
  onSelectChapter: (chapterIndex: number, paragraphIndex?: number) => void
  isDark: boolean
}

export const MindmapFullscreenModal: React.FC<MindmapFullscreenModalProps> = ({
  isOpen,
  bookTitle,
  layout,
  onClose,
  onSelectChapter,
  isDark,
}) => {
  const [scale, setScale] = useState(1.1)
  const [pan, setPan] = useState({ x: 40, y: 40 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 })

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const { nodes, totalHeight, rootY } = layout

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('g[data-interactive="true"]')) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartRef.current.x
    const dy = e.clientY - dragStartRef.current.y
    setPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy })
  }

  const handleMouseUp = () => setIsDragging(false)

  return (
    <div
      data-no-hud-toggle="true"
      className="fixed inset-0 z-50 flex flex-col bg-slate-900/40 backdrop-blur-md select-none overflow-hidden"
    >
      {/* Top Header Controls Bar */}
      <div
        className={`px-6 py-3.5 border-b shrink-0 flex items-center justify-between gap-4 z-20 ${
          isDark ? 'bg-[#1c1c1e] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#1b88ee]/12 text-[#1b88ee] flex items-center justify-center shrink-0">
            <Highlighter className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold truncate">全书笔记结构思维导图</h2>
              <span className="px-2 py-0.5 rounded-full bg-[#1b88ee]/10 text-[#1b88ee] text-[10px] font-semibold">
                全屏沉浸浏览
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">《{bookTitle}》· 点击任意笔记节点直达正文</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-current/5 rounded-full p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
              className="p-1.5 rounded-full hover:bg-current/10 transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono">{Math.round(scale * 100)}%</span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
              className="p-1.5 rounded-full hover:bg-current/10 transition-colors"
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setScale(1.1); setPan({ x: 40, y: 40 }) }}
              className="p-1.5 rounded-full hover:bg-current/10 transition-colors ml-1"
              title="还原居中"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="关闭全屏"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Fullscreen Interactive Canvas */}
      <div
        className={`flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing ${
          isDark ? 'bg-[#141416]' : 'bg-[#f4f6fa]'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="absolute inset-0 pointer-events-none"
        >
          <svg
            viewBox={`0 0 920 ${totalHeight}`}
            style={{ width: '920px', height: `${totalHeight}px`, overflow: 'visible' }}
            className="pointer-events-auto"
          >
            {/* Root Book Node */}
            <g transform={`translate(24, ${rootY})`}>
              <rect x={0} y={0} width={170} height={56} rx={16} fill="#1b88ee" />
              <text x={85} y={33} textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="bold">
                《{bookTitle.slice(0, 10)}》
              </text>
            </g>

            {nodes.map(({ ch, cy, leaves }) => (
              <g key={ch.id}>
                {/* Curve from Root to Chapter */}
                <path
                  d={`M 194 ${rootY + 28} C 240 ${rootY + 28}, 240 ${cy + 22}, 280 ${cy + 22}`}
                  fill="none"
                  stroke={isDark ? '#475569' : '#cbd5e1'}
                  strokeWidth="2"
                />
                <g
                  data-interactive="true"
                  transform={`translate(280, ${cy})`}
                  className="cursor-pointer"
                  onClick={() => {
                    onSelectChapter(ch.index)
                    onClose()
                  }}
                >
                  <rect
                    x={0}
                    y={0}
                    width={210}
                    height={44}
                    rx={12}
                    fill={isDark ? '#25262b' : '#ffffff'}
                    stroke="#1b88ee"
                    strokeWidth="1.6"
                  />
                  <text
                    x={14}
                    y={27}
                    fill={isDark ? '#e2e8f0' : '#1e293b'}
                    fontSize="12"
                    fontWeight="600"
                  >
                    {ch.title.slice(0, 14)} ({leaves.length})
                  </text>
                </g>

                {/* Leaf Highlight Nodes */}
                {leaves.map(({ hl, hy }) => {
                  const colorHex = COLOR_HEX[hl.color] || '#f59e0b'
                  return (
                    <g
                      key={hl.id}
                      data-interactive="true"
                      className="cursor-pointer"
                      onClick={() => {
                        onSelectChapter(hl.chapter_index, hl.paragraph_index)
                        onClose()
                      }}
                    >
                      <path
                        d={`M 490 ${cy + 22} C 525 ${cy + 22}, 525 ${hy + 18}, 560 ${hy + 18}`}
                        fill="none"
                        stroke={colorHex}
                        strokeWidth="1.8"
                      />
                      <rect
                        x={560}
                        y={hy}
                        width={330}
                        height={hl.note ? 48 : 36}
                        rx={10}
                        fill={isDark ? '#25262b' : '#ffffff'}
                        stroke={colorHex}
                        strokeWidth="1.6"
                      />
                      <text
                        x={572}
                        y={hy + 18}
                        fill={isDark ? '#f8fafc' : '#334155'}
                        fontSize="11"
                        fontWeight="500"
                      >
                        {hl.selected_text.slice(0, 26)}…
                      </text>
                      {hl.note && (
                        <text
                          x={572}
                          y={hy + 36}
                          fill="#d97706"
                          fontSize="10"
                          fontWeight="500"
                        >
                          💡 随想: {hl.note.slice(0, 26)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  )
}
