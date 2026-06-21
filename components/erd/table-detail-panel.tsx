'use client'

import { useMemo, useState } from 'react'
import { X, Key, Hash, Table2, ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'
import { HealthGauge } from './health-gauge'
import { assessTableHealth } from '@/lib/schema-health'
import type { ParsedSchema } from '@/lib/types'

interface TableDetailPanelProps {
  table: ParsedSchema['tables'][number]
  relations: ParsedSchema['relations']
  onClose: () => void
  onPreviewData?: () => void
}

const SEVERITY_ICONS = { error: AlertCircle, warning: AlertTriangle, info: Info }
const SEVERITY_COLORS = { error: 'text-red-400', warning: 'text-amber-400', info: 'text-blue-400' }

export function TableDetailPanel({ table, relations, onClose, onPreviewData }: TableDetailPanelProps) {
  const [showRecommendations, setShowRecommendations] = useState(false)
  const inbound = relations.filter((r) => r.toTable === table.name)
  const outbound = relations.filter((r) => r.fromTable === table.name)

  const health = useMemo(() => assessTableHealth(table, relations), [table, relations])
  const failedChecks = health.checks.filter((c) => !c.passed)

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
        <div className="px-4 py-3 border-b border-border grid grid-cols-3 gap-2">
          <Stat label="Columns" value={table.columns.length} />
          <Stat
            label="Est. rows"
            value={
              table.rowEstimate !== null && table.rowEstimate > 0
                ? table.rowEstimate.toLocaleString()
                : '—'
            }
          />
          <div className="flex items-center justify-center bg-secondary/50 rounded-md py-1.5">
            <HealthGauge score={health.score} size={40} />
          </div>
        </div>

        {/* Health recommendations (collapsible) */}
        {failedChecks.length > 0 && (
          <button
            onClick={() => setShowRecommendations((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:bg-secondary/30 transition-colors"
          >
            <span>{failedChecks.length} issue{failedChecks.length !== 1 ? 's' : ''} found</span>
            {showRecommendations ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}

        {showRecommendations && failedChecks.length > 0 && (
          <div className="px-4 py-2 border-b border-border space-y-1.5">
            {failedChecks.map((check, i) => {
              const Icon = SEVERITY_ICONS[check.severity]
              return (
                <div key={i} className="flex items-start gap-1.5">
                  <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${SEVERITY_COLORS[check.severity]}`} />
                  <div>
                    <p className="text-[10px] text-foreground leading-relaxed">{check.message}</p>
                    {check.suggestion && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">{check.suggestion}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Passed checks summary */}
        {health.passedCategories > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-border">
            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
            <span className="text-[10px] text-muted-foreground">
              {health.passedCategories}/{health.totalCategories} checks passed
            </span>
          </div>
        )}

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

        {/* Preview Data button */}
        {onPreviewData && (
          <div className="px-4 py-3 border-t border-border">
            <button
              onClick={onPreviewData}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium border border-primary/20 transition-colors"
            >
              <Table2 className="w-3.5 h-3.5" />
              Preview data
            </button>
          </div>
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
