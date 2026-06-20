'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Trash2, ExternalLink, Table2, GitBranch, Clock } from 'lucide-react'

interface SchemaCardProps {
  id: string
  name: string
  host: string
  database: string
  tableCount: number
  relationCount: number
  createdAt: Date
}

export function SchemaCard({
  id,
  name,
  host,
  database,
  tableCount,
  relationCount,
  createdAt,
}: SchemaCardProps) {
  const [hidden, setHidden] = useState(false)

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    if (!confirm('Delete this schema snapshot?')) return
    setHidden(true)
  }

  if (hidden) return null

  const timeAgo = (date: Date) => {
    const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (secs < 60) return 'just now'
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
    return `${Math.floor(secs / 86400)}d ago`
  }

  return (
    <Link
      href={`/explore/${id}`}
      className="group border border-border rounded-lg p-5 bg-card hover:bg-card/80 hover:border-primary/40 transition-all block"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
            {host}/{database}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Delete schema"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Table2 className="w-3 h-3" />
          {tableCount} {tableCount === 1 ? 'table' : 'tables'}
        </span>
        <span className="flex items-center gap-1">
          <GitBranch className="w-3 h-3" />
          {relationCount} {relationCount === 1 ? 'relation' : 'relations'}
        </span>
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="w-3 h-3" />
          {timeAgo(createdAt)}
        </span>
      </div>
    </Link>
  )
}
