'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Database, Loader2, AlertCircle } from 'lucide-react'

interface ConnectModalProps {
  onClose: () => void
}

export function ConnectModal({ onClose }: ConnectModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: '5432',
    database: '',
    username: '',
    password: '',
    ssl: true,
  })

  function update(key: string, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.host || !form.database || !form.username || !form.password) {
      setError('All fields are required.')
      return
    }
    setLoading(true)
    setError(null)
    // Frontend-only demo: simulate a connection then open the sample schema.
    setTimeout(() => {
      router.push('/explore/prod-ecommerce')
    }, 900)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold text-foreground">Connect Database</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Field label="Connection name" required>
            <input
              type="text"
              placeholder="My Production DB"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              className="input-field"
              disabled={loading}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Host" required>
                <input
                  type="text"
                  placeholder="my-cluster.cluster-xxx.us-east-1.rds.amazonaws.com"
                  value={form.host}
                  onChange={(e) => update('host', e.target.value)}
                  className="input-field font-mono text-xs"
                  disabled={loading}
                />
              </Field>
            </div>
            <Field label="Port">
              <input
                type="number"
                value={form.port}
                onChange={(e) => update('port', e.target.value)}
                className="input-field font-mono"
                disabled={loading}
              />
            </Field>
          </div>

          <Field label="Database" required>
            <input
              type="text"
              placeholder="postgres"
              value={form.database}
              onChange={(e) => update('database', e.target.value)}
              className="input-field font-mono"
              disabled={loading}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Username" required>
              <input
                type="text"
                placeholder="postgres"
                value={form.username}
                onChange={(e) => update('username', e.target.value)}
                className="input-field font-mono"
                disabled={loading}
              />
            </Field>
            <Field label="Password" required>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                className="input-field"
                disabled={loading}
              />
            </Field>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={form.ssl}
                onChange={(e) => update('ssl', e.target.checked)}
                className="sr-only"
                disabled={loading}
              />
              <div
                className={`w-9 h-5 rounded-full transition-colors ${form.ssl ? 'bg-primary' : 'bg-secondary'}`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${form.ssl ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </div>
            </div>
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              Enable SSL / TLS
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 px-4 text-sm rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Connecting…
                </>
              ) : (
                'Connect & explore'
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          background: var(--secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 20%, transparent);
        }
        .input-field::placeholder {
          color: var(--muted-foreground);
        }
        .input-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
