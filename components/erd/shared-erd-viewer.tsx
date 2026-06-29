'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Database, Table2, GitBranch, Lock, Loader2 } from 'lucide-react'
import type { ParsedSchema } from '@/lib/types'
import { useState, useCallback } from 'react'
import { TableDetailPanel } from './table-detail-panel'

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

interface SharedERDViewerProps {
  name: string
  schema: ParsedSchema
}

export function SharedERDViewer({ name, schema }: SharedERDViewerProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null)

  const selectedTableData = selectedTable
    ? schema.tables.find((t) => t.name === selectedTable) ?? null
    : null

  const handleTableSelect = useCallback((tableName: string | null) => {
    setSelectedTable(tableName)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Topbar */}
      <header className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Database className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground hidden sm:block">SchemaLens</span>
          </Link>
          <span className="text-border">|</span>
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
          <div className="hidden sm:flex items-center gap-3 ml-1 text-xs text-muted-foreground">
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
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span className="hidden sm:inline">Read-only view</span>
          </div>
          <Link
            href="/sign-up"
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Main canvas */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <ERDCanvas schema={schema} onTableSelect={handleTableSelect} />
        </div>

        {selectedTableData && (
          <TableDetailPanel
            table={selectedTableData}
            relations={schema.relations}
            onClose={() => setSelectedTable(null)}
          />
        )}
      </div>
    </div>
  )
}
