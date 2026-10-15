import React from 'react'
import type {
  ParsedTableData,
  ParsedPoetryData,
  ParsedBlockquoteData,
} from '../helpers/publicationMarkerHelpers'

interface TableFigureProps {
  data: ParsedTableData
  itemKey: string
  pIdx: number
}

export const TableFigure: React.FC<TableFigureProps> = ({ data, itemKey, pIdx }) => {
  return (
    <figure
      key={itemKey}
      data-para-index={pIdx}
      data-no-hud-toggle="true"
      onClick={(e) => e.stopPropagation()}
      className="reader-block-contain break-inside-avoid my-6 rounded-2xl border border-current/15 bg-current/[0.02] shadow-xs overflow-hidden select-text"
    >
      {data.title && (
        <figcaption className="px-4 py-2.5 border-b border-current/10 text-xs font-semibold tracking-wide text-center bg-current/[0.03]">
          {data.title}
        </figcaption>
      )}
      <div className="overflow-x-auto p-1 sm:p-2">
        <table className="w-full text-left text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="border-b border-current/15 bg-current/[0.04]">
              {data.headers.map((h, i) => (
                <th key={i} className="py-2 px-3 font-bold tracking-tight opacity-90">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-current/10">
            {data.rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="hover:bg-current/[0.03] transition-colors odd:bg-transparent even:bg-current/[0.015]"
              >
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="py-2 px-3 opacity-85 leading-relaxed">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

interface PoetryFigureProps {
  data: ParsedPoetryData
  itemKey: string
  pIdx: number
}

export const PoetryFigure: React.FC<PoetryFigureProps> = ({ data, itemKey, pIdx }) => {
  return (
    <div
      key={itemKey}
      data-para-index={pIdx}
      className="break-inside-avoid my-6 py-4 px-6 rounded-2xl bg-current/[0.02] border-y border-current/10 text-center select-text"
    >
      {data.title && (
        <h4 className="font-serif font-bold text-base sm:text-lg mb-1 tracking-widest opacity-95">
          {data.title}
        </h4>
      )}
      {data.author && (
        <p className="text-xs font-serif italic opacity-70 mb-3 tracking-wider">
          —— {data.author}
        </p>
      )}
      <div className="space-y-1.5 font-serif text-[1.05em] leading-relaxed tracking-wider opacity-90 inline-block text-left sm:text-center mx-auto">
        {data.lines.map((line, idx) => (
          <p key={idx} className="indent-0">
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}

interface BlockquoteFigureProps {
  data: ParsedBlockquoteData
  itemKey: string
  pIdx: number
}

export const BlockquoteFigure: React.FC<BlockquoteFigureProps> = ({ data, itemKey, pIdx }) => {
  return (
    <blockquote
      key={itemKey}
      data-para-index={pIdx}
      className="break-inside-avoid my-5 pl-5 pr-4 py-3.5 rounded-r-2xl border-l-4 border-amber-500/80 bg-amber-500/[0.05] dark:bg-amber-400/[0.04] text-justify select-text shadow-2xs"
    >
      <div className="relative font-serif text-[1.02em] leading-relaxed italic opacity-95">
        <span className="text-amber-500/40 text-2xl font-serif leading-none absolute -left-3 -top-2 select-none">
          “
        </span>
        <span className="relative z-10">{data.text}</span>
      </div>
      {data.author && (
        <div className="mt-2 text-right text-xs font-serif opacity-75 italic tracking-wide">
          —— {data.author}
        </div>
      )}
    </blockquote>
  )
}
