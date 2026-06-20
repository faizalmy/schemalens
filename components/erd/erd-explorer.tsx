'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import {
  ArrowLeft,
  Sparkles,
  Share2,
  Table2,
  GitBranch,
  Database,
  Check,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { TableDetailPanel } from './table-detail-panel'
import { AiDocsPanel } from './ai-docs-panel'
import type { ParsedSchema } from '@/lib/dummy-data'

// Dynamically import canvas to avoid SSR issues with ReactFlow
const ERDCanvas = dynamic(() => import('./erd-canvas').then((m) => ({ default: m.ERDCanvas })), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading diagram…
      </div>
    </div>
  ),
})

interface ERDExplorerProps {
  name: string
  schema: ParsedSchema
  aiDocumentation: string | null
}

export function ERDExplorer({ name, schema, aiDocumentation }: ERDExplorerProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [showDocs, setShowDocs] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const selectedTableData = selectedTable
    ? schema.tables.find((t) => t.name === selectedTable) ?? null
    : null

  const handleTableSelect = useCallback((tableName: string | null) => {
    setSelectedTable(tableName)
    if (tableName) setShowDocs(false)
  }, [])

  async function handleShare() {
    setSharing(true)
    // Frontend-only demo: copy a sample share link.
    const url = `${window.location.origin}/share/demo-share`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // clipboard may be unavailable in the preview iframe — ignore
    }
    setCopied(true)
    setSharing(false)
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Topbar */}
      <header className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Database className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-semibold text-foreground truncate block">
                {name}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-3 ml-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Table2 className="w-3 h-3" />
              {schema.tables.length} tables
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {schema.relations.length} relations
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowDocs((v) => !v)
              if (!showDocs) setSelectedTable(null)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showDocs
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Docs</span>
          </button>

          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {sharing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : copied ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>
      </header>

      {/* Main canvas area */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <ERDCanvas schema={schema} onTableSelect={handleTableSelect} />
        </div>

        {/* Side panels */}
        {selectedTableData && !showDocs && (
          <TableDetailPanel
            table={selectedTableData}
            relations={schema.relations}
            onClose={() => setSelectedTable(null)}
          />
        )}
        {showDocs && (
          <AiDocsPanel
            existingDocs={aiDocumentation}
            onClose={() => setShowDocs(false)}
          />
        )}
      </div>
    </div>
  )
}
