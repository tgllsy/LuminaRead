import React from 'react'
import type { SpoilerFreeRecapData, CharacterNode } from '../types'
import { formatCharacterShortName } from '../helpers'

interface CopilotConstellationGraphProps {
  recapData: SpoilerFreeRecapData
  selectedChar: CharacterNode | null
  onSelectChar: (char: CharacterNode) => void
  isDark: boolean
}

export const CopilotConstellationGraph: React.FC<CopilotConstellationGraphProps> = ({
  recapData,
  selectedChar,
  onSelectChar,
  isDark,
}) => {
  const nodes = Array.isArray(recapData?.character_graph?.nodes)
    ? recapData.character_graph.nodes
    : []
  const edges = Array.isArray(recapData?.character_graph?.edges)
    ? recapData.character_graph.edges
    : []
  const total = Math.max(1, nodes.length)

  return (
    <div
      className={`lg:col-span-3 rounded-2xl p-4 border flex flex-col justify-between ${
        isDark
          ? 'bg-[#1c1c1e] border-white/8'
          : 'bg-gradient-to-b from-white to-[#f3f7fc] border-slate-200/80 shadow-2xs'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className={`text-xs font-bold ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}
        >
          已出场人物 / 章节脉络图谱
        </span>
        <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#1b88ee]/10 text-[#1b88ee] font-semibold shrink-0">
          已解锁 {nodes.length} 节点
        </span>
      </div>

      <svg viewBox="0 0 420 240" className="w-full h-52 sm:h-56 select-none">
        {/* Subtle decorative orbit ring */}
        <ellipse
          cx={210}
          cy={120}
          rx={126}
          ry={76}
          fill="none"
          stroke={isDark ? '#2c2e33' : '#e2e8f0'}
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Edges */}
        {edges.map((edge, idx) => {
          const sIdx = nodes.findIndex((n) => n.id === edge.source)
          const tIdx = nodes.findIndex((n) => n.id === edge.target)
          if (sIdx === -1 || tIdx === -1) return null

          const angleS = (sIdx / total) * Math.PI * 2 - Math.PI / 2
          const angleT = (tIdx / total) * Math.PI * 2 - Math.PI / 2
          const sx = 210 + Math.cos(angleS) * 126
          const sy = 120 + Math.sin(angleS) * 76
          const tx = 210 + Math.cos(angleT) * 126
          const ty = 120 + Math.sin(angleT) * 76
          const isConnected =
            selectedChar &&
            (edge.source === selectedChar.id || edge.target === selectedChar.id)
          const showBadge =
            isConnected &&
            edge.relation &&
            edge.relation !== '叙事演进脉络'
          const lx = (sx + tx) / 2
          const ly = (sy + ty) / 2
          const labelWidth = Math.max(46, edge.relation.length * 10 + 12)

          return (
            <g key={idx}>
              <line
                x1={sx}
                y1={sy}
                x2={tx}
                y2={ty}
                stroke={
                  isConnected
                    ? '#1b88ee'
                    : isDark
                    ? '#3f4451'
                    : '#cbd5e1'
                }
                strokeWidth={isConnected ? '2' : '1.4'}
                strokeDasharray={isConnected ? undefined : '4 3'}
                opacity={isConnected ? '0.9' : '0.65'}
              />
              {showBadge && (
                <>
                  <rect
                    x={lx - labelWidth / 2}
                    y={ly - 8}
                    width={labelWidth}
                    height={16}
                    rx={8}
                    fill={isDark ? '#1c1c1e' : '#ffffff'}
                    stroke="#1b88ee"
                    strokeWidth="1"
                  />
                  <text
                    x={lx}
                    y={ly + 3}
                    textAnchor="middle"
                    fill="#1b88ee"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {edge.relation}
                  </text>
                </>
              )}
            </g>
          )
        })}

        {/* Nodes */}
        {nodes.map((node, idx) => {
          const angle = (idx / total) * Math.PI * 2 - Math.PI / 2
          const cx = total === 1 ? 210 : 210 + Math.cos(angle) * 126
          const cy = total === 1 ? 120 : 120 + Math.sin(angle) * 76
          const isSelected = selectedChar?.id === node.id
          const shortName = formatCharacterShortName(node.name)
          const pillW = Math.max(56, shortName.length * 11 + 18)

          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => onSelectChar(node)}
            >
              {isSelected && (
                <circle cx={cx} cy={cy} r={26} fill="#1b88ee" opacity="0.14" />
              )}
              <rect
                x={cx - pillW / 2}
                y={cy - 13}
                width={pillW}
                height={26}
                rx={13}
                fill={
                  isSelected
                    ? '#1b88ee'
                    : isDark
                    ? '#2c2c2e'
                    : '#ffffff'
                }
                stroke={
                  isSelected
                    ? '#1b88ee'
                    : isDark
                    ? '#4b5563'
                    : '#93c5fd'
                }
                strokeWidth={isSelected ? '2' : '1.4'}
              />
              <text
                x={cx}
                y={cy + 4}
                textAnchor="middle"
                fill={
                  isSelected
                    ? '#ffffff'
                    : isDark
                    ? '#e2e8f0'
                    : '#1e293b'
                }
                fontSize="11"
                fontWeight={isSelected ? '700' : '600'}
              >
                {shortName}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Quick-Select Pills */}
      <div
        className={`flex flex-wrap items-center gap-1.5 pt-2.5 border-t ${
          isDark ? 'border-white/8' : 'border-slate-200/70'
        }`}
      >
        {nodes.map((node) => {
          const active = selectedChar?.id === node.id
          return (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectChar(node)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0 ${
                active
                  ? 'bg-[#1b88ee] text-white font-semibold shadow-2xs'
                  : isDark
                  ? 'bg-[#2c2c2e] text-slate-300 hover:bg-white/10'
                  : 'bg-[#f2f3f5] text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {node.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
