'use client'

import { useState, useCallback } from 'react'
import { Table2, Loader2, X, ChevronDown, AlertCircle } from 'lucide-react'

interface DataPreviewPanelProps {
  schemaId: string
  tableName: string
  onClose: () => void
}

interface ColumnMeta {
  name: string
  type: number
}

export function DataPreviewPanel({ schemaId, tableName, onClose }: DataPreviewPanelProps) {
  const [data, setData] = useState<{ columns: ColumnMeta[]; rows: Record<string, any>[] } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLoad = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setData(null)

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaId, tableName, limit: 25 }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Query failed (${res.status})`)
      }

      const result = await res.json()
      setData(result)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [schemaId, tableName])

  return (
    <div className="w-96 h-full bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Table2 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">{tableName}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!data && !isLoading && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <ChevronDown className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Preview data</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Load the first 25 rows from <code className="text-primary font-mono">{tableName}</code>.
              </p>
            </div>
            <button
              onClick={handleLoad}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Table2 className="w-3.5 h-3.5" />
              Load data
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            Querying database…
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 px-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-xs font-medium text-red-400 mb-1">Query failed</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
            <button
              onClick={handleLoad}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {data && data.rows.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Table is empty
          </div>
        )}

        {data && data.rows.length > 0 && (
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-card z-10">
                <tr>
                  <th className="text-left text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-3 py-2 border-b border-border bg-secondary/30 whitespace-nowrap">
                    #
                  </th>
                  {data.columns.map((col) => (
                    <th
                      key={col.name}
                      className="text-left text-[10px] text-muted-foreground font-semibold uppercase tracking-wider px-3 py-2 border-b border-border bg-secondary/30 whitespace-nowrap font-mono"
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-1.5 text-muted-foreground border-b border-border/40 text-[10px]">
                      {i + 1}
                    </td>
                    {data.columns.map((col) => (
                      <td
                        key={col.name}
                        className="px-3 py-1.5 text-foreground border-b border-border/40 font-mono max-w-[200px] truncate"
                        title={formatValue(row[col.name])}
                      >
                        {formatValue(row[col.name])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border">
              Showing {data.rows.length} row{data.rows.length !== 1 ? 's' : ''}
              {data.rows.length === 25 && ' (limit reached)'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatValue(value: unknown): string {
  if (value === null) return <span className="text-muted-foreground italic">NULL</span> as any
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
