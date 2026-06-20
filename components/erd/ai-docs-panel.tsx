'use client'

import { useState } from 'react'
import { Sparkles, Loader2, X, Copy, Check } from 'lucide-react'
import type { ParsedSchema } from '@/lib/types'

interface AiDocsPanelProps {
  schemaId: string
  schema: ParsedSchema
  existingDocs: Record<string, string> | null
  onClose: () => void
}

export function AiDocsPanel({ schemaId, schema, existingDocs, onClose }: AiDocsPanelProps) {
  const [docs, setDocs] = useState<Record<string, string> | null>(existingDocs)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setIsLoading(true)
    setError(null)
    setDocs(null)
    try {
      const res = await fetch('/api/generate-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schemaId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate docs')
      }
      const data = await res.json()
      setDocs(data.docs)
    } catch (err: any) {
      setError(err.message || 'Failed to generate documentation')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy() {
    if (!docs) return
    const text = Object.entries(docs)
      .map(([table, doc]) => `${table}\n${doc}`)
      .join('\n\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // clipboard may be unavailable in the preview iframe — ignore
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasDocs = docs && Object.keys(docs).length > 0

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
        {!hasDocs && !isLoading && !error ? (
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
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Generating documentation…
              </div>
            )}
            {hasDocs && Object.entries(docs).map(([table, doc]) => (
              <div key={table}>
                <div className="text-xs font-semibold text-primary mb-1 font-mono">{table}</div>
                <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap font-sans">
                  {doc}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer actions */}
      {hasDocs && (
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
