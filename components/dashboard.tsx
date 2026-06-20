'use client'

import { useState } from 'react'
import { Plus, Database } from 'lucide-react'
import { SchemaCard } from './schema-card'
import { ConnectModal } from './connect-modal'
import type { SchemaMeta } from '@/lib/dummy-data'

interface DashboardProps {
  schemas: SchemaMeta[]
  userName: string
}

export function Dashboard({ schemas, userName }: DashboardProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Your schemas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back, {userName.split(' ')[0]}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Connect database
        </button>
      </div>

      {/* Schema grid */}
      {schemas.length === 0 ? (
        <EmptyState onConnect={() => setShowModal(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemas.map((s) => (
            <SchemaCard
              key={s.id}
              id={s.id}
              name={s.name}
              host={s.host}
              database={s.database}
              tableCount={s.tableCount}
              relationCount={s.relationCount}
              createdAt={s.createdAt}
            />
          ))}
          {/* Add new card */}
          <button
            onClick={() => setShowModal(true)}
            className="border border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[120px]"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Add database</span>
          </button>
        </div>
      )}

      {showModal && <ConnectModal onClose={() => setShowModal(false)} />}
    </main>
  )
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
        <Database className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-base font-semibold text-foreground mb-2">No schemas yet</h2>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6">
        Connect your first AWS Aurora PostgreSQL database to generate an interactive ERD diagram.
      </p>
      <button
        onClick={onConnect}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Connect database
      </button>
    </div>
  )
}
