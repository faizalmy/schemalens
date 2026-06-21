'use client'

import type { ReactNode } from 'react'
import type { TableInfo } from '@/lib/types'
import { buildSchemaSummary } from '@/lib/schema-chat/context-builder'
import { PenLine, Search, Link2, ClipboardList, MessageSquare } from 'lucide-react'

interface ChatSuggestedQuestionsProps {
  onSelect: (text: string) => void
  schemaTables?: TableInfo[]
}

const fixedSuggestions: { label: string; icon: ReactNode }[] = [
  { label: 'Write me a query that finds...', icon: <PenLine className="w-3.5 h-3.5" /> },
  { label: 'Show all tables without indexes...', icon: <Search className="w-3.5 h-3.5" /> },
  { label: 'Explain the relationship between...', icon: <Link2 className="w-3.5 h-3.5" /> },
  { label: 'Summarise the entire schema for me', icon: <ClipboardList className="w-3.5 h-3.5" /> },
]

export function ChatSuggestedQuestions({ onSelect, schemaTables }: ChatSuggestedQuestionsProps) {
  const dynamicSuggestions = schemaTables && schemaTables.length > 0
    ? buildSchemaSummary(schemaTables)
    : []

  const allSuggestions = [...fixedSuggestions, ...dynamicSuggestions].slice(0, 7)

  if (!schemaTables || schemaTables.length === 0) {
    return (
      <div className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground mb-2">
          <MessageSquare className="w-3 h-3 inline-block align-text-bottom mr-1" /> I can write and run SQL for you. Try:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {allSuggestions.map((s) => (
            <button
              key={s.label}
              onClick={() => onSelect(s.label)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-muted-foreground/30 transition-colors"
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-2">
      <div className="flex flex-wrap gap-1.5">
        {allSuggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSelect(s.label)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-muted-foreground/30 transition-colors"
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
