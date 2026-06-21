'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface ChatResultTableProps {
  columns: { name: string; type: string }[]
  rows: unknown[][]
  rowCount: number
  truncated: boolean
}

export function ChatResultTable({ columns, rows, rowCount, truncated }: ChatResultTableProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopyCsv() {
    const header = columns.map((c) => c.name).join(',')
    const data = rows.map((r) =>
      r
        .map((v) => {
          if (v === null) return 'NULL'
          if (typeof v === 'string') return `"${v.replace(/"/g, '""')}"`
          return String(v)
        })
        .join(','),
    )
    const csv = [header, ...data].join('\n')
    try {
      await navigator.clipboard.writeText(csv)
    } catch {
      // clipboard may be unavailable
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      <div className="overflow-auto max-h-80">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 bg-card z-10">
            <tr>
              <th className="text-left text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-3 py-2 border-b border-border bg-secondary/30 whitespace-nowrap">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.name}
                  className="text-left text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-3 py-2 border-b border-border bg-secondary/30 whitespace-nowrap font-mono"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.name}</span>
                    <span className="text-[9px] text-muted-foreground/60 font-normal bg-secondary/50 rounded px-1">
                      {col.type}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-secondary/30 transition-colors">
                <td className="px-3 py-1.5 text-muted-foreground border-b border-border/40 text-[10px]">
                  {i + 1}
                </td>
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className="px-3 py-1.5 text-foreground border-b border-border/40 font-mono max-w-[200px] truncate"
                    title={formatCell(cell)}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-border">
        <span className="text-[10px] text-muted-foreground">
          {rowCount} row{rowCount !== 1 ? 's' : ''}
          {truncated && ' (truncated)'}
        </span>
        <button
          onClick={handleCopyCsv}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <Check className="w-3 h-3 text-primary" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
          {copied ? 'Copied' : 'Copy CSV'}
        </button>
      </div>
    </div>
  )
}

function formatCell(value: unknown): string {
  if (value === null) return 'NULL'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
