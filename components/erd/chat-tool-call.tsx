'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Check, X, Loader2, ChevronDown, ChevronRight, PenLine, ShieldCheck, Wrench } from 'lucide-react'

interface ChatToolCallProps {
  tool: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
  status: 'running' | 'success' | 'error'
}

const toolIcons: Record<string, ReactNode> = {
  generate_sql: <PenLine className="w-4 h-4" />,
  check_sql: <ShieldCheck className="w-4 h-4" />,
  execute_sql: <Wrench className="w-4 h-4" />,
}

export function ChatToolCallCard({ tool, input, output, error, status }: ChatToolCallProps) {
  const [expanded, setExpanded] = useState(false)

  const icon = toolIcons[tool] || <Wrench className="w-4 h-4" />

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-colors ${
        status === 'error'
          ? 'border-red-400/50 bg-red-500/5'
          : 'border-border bg-card'
      }`}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-mono font-medium text-foreground flex-1">
          {tool}
        </span>
        <div className="flex items-center gap-1">
          {status === 'running' && (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          )}
          {status === 'success' && (
            <Check className="w-3 h-3 text-green-500" />
          )}
          {status === 'error' && (
            <X className="w-3 h-3 text-red-400" />
          )}
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {error && (
        <div className="px-3 pb-2">
          <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1 animate-pulse">
            {error}
          </div>
        </div>
      )}

      {expanded && (input || output) && (
        <div className="px-3 pb-2 space-y-2">
          {input && (
            <div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Input
              </div>
              <pre className="text-xs bg-secondary/30 rounded p-2 overflow-x-auto text-foreground/80 font-mono">
                {JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output && (
            <div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">
                Output
              </div>
              <pre className="text-xs bg-secondary/30 rounded p-2 overflow-x-auto text-foreground/80 font-mono">
                {JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
