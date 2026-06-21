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
  Download,
  FileText,
  FileCode,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { TableDetailPanel } from './table-detail-panel'
import { AiDocsPanel } from './ai-docs-panel'
import { DataPreviewPanel } from './data-preview-panel'
import { SchemaChatPanel } from './schema-chat-panel'
import { generateMarkdown, generateDDL, downloadFile } from '@/lib/export'
import type { ParsedSchema } from '@/lib/types'

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
  schemaId: string
  schema: ParsedSchema
  aiDocumentation: Record<string, string> | null
}

export function ERDExplorer({ name, schemaId, schema, aiDocumentation }: ERDExplorerProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [showDocs, setShowDocs] = useState(false)
  const [showDataPreview, setShowDataPreview] = useState(false)
  const [showSchemaChat, setShowSchemaChat] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  const selectedTableData = selectedTable
    ? schema.tables.find((t) => t.name === selectedTable) ?? null
    : null

  const handleTableSelect = useCallback((tableName: string | null) => {
    setSelectedTable(tableName)
    if (tableName) {
      setShowDocs(false)
      setShowDataPreview(false)
      setShowSchemaChat(false)
    }
  }, [])

  async function handleShare() {
    setSharing(true)
    try {
      const res = await fetch(`/api/schema/${schemaId}/share`, { method: 'POST' })
      if (!res.ok) return
      const data = await res.json()
      const url = `${window.location.origin}${data.url}`
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        // clipboard may be unavailable in the preview iframe — ignore
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } finally {
      setSharing(false)
    }
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
              if (!showDocs) {
                setSelectedTable(null)
                setShowDataPreview(false)
                setShowSchemaChat(false)
              }
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
            onClick={() => {
              setShowSchemaChat((v) => !v)
              if (!showSchemaChat) {
                setSelectedTable(null)
                setShowDocs(false)
                setShowDataPreview(false)
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              showSchemaChat
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Schema Chat</span>
          </button>

          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              onBlur={() => setTimeout(() => setShowExportMenu(false), 200)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-card shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => {
                    const md = generateMarkdown(schema, name, aiDocumentation)
                    downloadFile(md, `${name.toLowerCase().replace(/\s+/g, '-')}-schema.md`, 'text/markdown')
                    setShowExportMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Markdown docs
                </button>
                <button
                  onClick={() => {
                    const ddl = generateDDL(schema)
                    downloadFile(ddl, `${name.toLowerCase().replace(/\s+/g, '-')}-schema.sql`, 'text/plain')
                    setShowExportMenu(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                  SQL DDL
                </button>
              </div>
            )}
          </div>

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
        {selectedTableData && !showDocs && !showDataPreview && (
          <TableDetailPanel
            table={selectedTableData}
            relations={schema.relations}
            onClose={() => setSelectedTable(null)}
            onPreviewData={() => {
              setShowDataPreview(true)
              setShowSchemaChat(false)
            }}
          />
        )}
        {showDocs && (
          <AiDocsPanel
            schemaId={schemaId}
            schema={schema}
            existingDocs={aiDocumentation}
            onClose={() => setShowDocs(false)}
          />
        )}
        {showDataPreview && selectedTable && (
          <DataPreviewPanel
            schemaId={schemaId}
            tableName={selectedTable}
            onClose={() => setShowDataPreview(false)}
          />
        )}
        {/* Chat panel — always mounted to preserve state, hidden via CSS */}
        <div className={showSchemaChat ? '' : 'hidden'}>
          <SchemaChatPanel
            schemaId={schemaId}
            schema={schema}
            onClose={() => setShowSchemaChat(false)}
          />
        </div>
      </div>
    </div>
  )
}
