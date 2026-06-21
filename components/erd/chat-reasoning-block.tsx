'use client'

import { useState } from 'react'
import { BrainCircuit } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatReasoningBlockProps {
  content: string
  isLatest?: boolean
}

export function ChatReasoningBlock({ content, isLatest }: ChatReasoningBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const MAX_PREVIEW_CHARS = 150
  const needsTruncation = content.length > MAX_PREVIEW_CHARS
  const preview = needsTruncation ? content.slice(0, MAX_PREVIEW_CHARS) + '...' : content
  const showAnimated = isLatest && !content.endsWith('\n')

  const markdownComponents = {
    code({ className, children, ...props }: any) {
      const isInline = !className
      return isInline ? (
        <code className="bg-secondary/60 rounded px-1 py-0.5 text-xs font-mono" {...props}>
          {children}
        </code>
      ) : (
        <pre className="bg-secondary/60 rounded p-2 overflow-x-auto text-xs font-mono border border-border/40 my-1">
          <code className={className} {...props}>{children}</code>
        </pre>
      )
    },
    pre({ children }: any) {
      return <>{children}</>
    },
    p({ children }: any) {
      return <p className="text-xs">{children}</p>
    },
    ul({ children }: any) {
      return <ul className="list-disc pl-4 my-0.5 space-y-0.5 text-xs">{children}</ul>
    },
    ol({ children }: any) {
      return <ol className="list-decimal pl-4 my-0.5 space-y-0.5 text-xs">{children}</ol>
    },
    a({ href, children }: any) {
      return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>
    },
  }

  return (
    <div
      className="rounded-lg bg-secondary/40 border border-border overflow-hidden cursor-pointer transition-colors hover:bg-secondary/60"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-2 px-3 py-2">
        <BrainCircuit className={`w-4 h-4 text-muted-foreground shrink-0 mt-0.5 ${showAnimated ? 'animate-pulse' : ''}`} />
        <div className="text-xs text-muted-foreground leading-relaxed min-w-0 flex-1">
          <div className="[&>p:empty]:hidden [&>p]:mb-1 [&>p:last-child]:mb-0 [&>ul]:mb-1 [&>ol]:mb-1 [&>*+*]:mt-0.5">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {expanded || !needsTruncation ? content : preview}
            </ReactMarkdown>
          </div>
        </div>
        {needsTruncation && (
          <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>
    </div>
  )
}
