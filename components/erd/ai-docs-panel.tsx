'use client'

import { useState } from 'react'
import { Sparkles, Loader2, X, Copy, Check } from 'lucide-react'
import { sampleGeneratedDocs } from '@/lib/dummy-data'

interface AiDocsPanelProps {
  existingDocs: string | null
  onClose: () => void
}

export function AiDocsPanel({ existingDocs, onClose }: AiDocsPanelProps) {
  const [docs, setDocs] = useState<string>(existingDocs ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleGenerate() {
    setIsLoading(true)
    setDocs('')
    // Frontend-only demo: stream the sample docs word by word.
    const words = sampleGeneratedDocs.split(' ')
    let i = 0
    const interval = setInterval(() => {
      i += 1
      setDocs(words.slice(0, i).join(' '))
      if (i >= words.length) {
        clearInterval(interval)
        setIsLoading(false)
      }
    }, 18)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(docs)
    } catch {
      // clipboard may be unavailable in the preview iframe — ignore
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const displayDocs = docs

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">AI Documentation</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!displayDocs && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Generate documentation</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Use AI to create comprehensive documentation for your schema including table purposes, column descriptions, and relationship explanations.
              </p>
            </div>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate docs
            </button>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            {isLoading && !displayDocs && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Generating documentation…
              </div>
            )}
            <div
              className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans"
              style={{ lineHeight: '1.6' }}
            >
              {displayDocs}
              {isLoading && <span className="inline-block w-1 h-3 bg-primary animate-pulse ml-0.5 align-middle" />}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {displayDocs && (
        <div className="p-4 border-t border-border flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex-1 py-1.5 px-3 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Regenerate
          </button>
          <button
            onClick={handleCopy}
            className="py-1.5 px-3 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      )}
    </div>
  )
}
