'use client'

import { X, Key, Hash } from 'lucide-react'
import type { ParsedSchema } from '@/lib/types'

interface TableDetailPanelProps {
  table: ParsedSchema['tables'][number]
  relations: ParsedSchema['relations']
  onClose: () => void
}

export function TableDetailPanel({ table, relations, onClose }: TableDetailPanelProps) {
  const inbound = relations.filter((r) => r.toTable === table.name)
  const outbound = relations.filter((r) => r.fromTable === table.name)

  return (
    <div className="w-72 h-full bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-semibold font-mono text-foreground">{table.name}</span>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stats */}
        <div className="px-4 py-3 border-b border-border grid grid-cols-2 gap-3">
          <Stat label="Columns" value={table.columns.length} />
          <Stat
            label="Est. rows"
            value={
              table.rowEstimate !== null && table.rowEstimate > 0
                ? table.rowEstimate.toLocaleString()
                : '—'
            }
          />
        </div>

        {/* Columns */}
        <section className="px-4 py-3">
          <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Columns
          </h3>
          <div className="space-y-1">
            {table.columns.map((col) => (
              <div
                key={col.name}
                className="flex items-start gap-2 py-1 border-b border-border/40 last:border-0"
              >
                <div className="mt-0.5 w-3 shrink-0">
                  {col.primaryKey ? (
                    <Key className="w-2.5 h-2.5 text-primary" />
                  ) : col.unique ? (
                    <Hash className="w-2.5 h-2.5 text-muted-foreground" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs font-mono text-foreground">{col.name}</span>
                    {col.primaryKey && (
                      <span className="text-[9px] px-1 rounded bg-primary/15 text-primary font-medium">
                        PK
                      </span>
                    )}
                    {col.unique && !col.primaryKey && (
                      <span className="text-[9px] px-1 rounded bg-secondary text-muted-foreground font-medium">
                        UQ
                      </span>
                    )}
                    {!col.nullable && !col.primaryKey && (
                      <span className="text-[9px] px-1 rounded bg-secondary text-muted-foreground font-medium">
                        NOT NULL
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{col.type}</span>
                  {col.defaultValue && (
                    <div className="text-[10px] text-muted-foreground/70 truncate">
                      default: {col.defaultValue}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Relations */}
        {(outbound.length > 0 || inbound.length > 0) && (
          <section className="px-4 py-3 border-t border-border">
            <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Relationships
            </h3>

            {outbound.length > 0 && (
              <div className="mb-3">
                <div className="text-[10px] text-muted-foreground mb-1.5">References</div>
                {outbound.map((r) => (
                  <div key={r.constraintName} className="text-xs font-mono text-foreground/80 py-0.5">
                    <span className="text-primary">{r.fromColumn}</span>
                    {' → '}
                    <span className="text-muted-foreground">{r.toTable}</span>
                    {'('}
                    <span className="text-primary">{r.toColumn}</span>
                    {')'}
                  </div>
                ))}
              </div>
            )}

            {inbound.length > 0 && (
              <div>
                <div className="text-[10px] text-muted-foreground mb-1.5">Referenced by</div>
                {inbound.map((r) => (
                  <div key={r.constraintName} className="text-xs font-mono text-foreground/80 py-0.5">
                    <span className="text-muted-foreground">{r.fromTable}</span>
                    {'('}
                    <span className="text-primary">{r.fromColumn}</span>
                    {')'}
                    {' → '}
                    <span className="text-primary">{r.toColumn}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-secondary/50 rounded-md px-3 py-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}
