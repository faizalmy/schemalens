'use client'

import { useState } from 'react'
import { BrainCircuit } from 'lucide-react'

interface ChatReasoningBlockProps {
  content: string
  isLatest?: boolean
}

export function ChatReasoningBlock({ content, isLatest }: ChatReasoningBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const lines = content.split('\n')
  const isMultiLine = lines.length > 1
  const preview = isMultiLine ? lines[0] + '...' : content
  const showAnimated = isLatest && !content.endsWith('\n')

  return (
    <div
      className="rounded-lg bg-secondary/40 border border-border overflow-hidden cursor-pointer transition-colors hover:bg-secondary/60"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <BrainCircuit className={`w-4 h-4 text-muted-foreground shrink-0 mt-0.5 ${showAnimated ? 'animate-pulse' : ''}`} />
        <div className="text-xs text-muted-foreground leading-relaxed min-w-0">
          {expanded || !isMultiLine ? (
            <span className="whitespace-pre-wrap">{content}</span>
          ) : (
            <span>{preview}</span>
          )}
        </div>
        {isMultiLine && (
          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
    </div>
  )
}
