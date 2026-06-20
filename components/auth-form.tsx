'use client'

import Link from 'next/link'
import { Database, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

interface AuthFormProps {
  mode: 'sign-in' | 'sign-up'
}

export function AuthForm({ mode }: AuthFormProps) {
  const { fields, loading, error, update, submit } = useAuth(mode)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await submit()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background grid pattern */}
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <span className="font-semibold text-lg text-foreground tracking-tight">SchemaLens</span>
          </Link>
          <h1 className="text-lg font-semibold text-foreground mt-4">
            {mode === 'sign-in' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'sign-in'
              ? 'Sign in to access your schema explorer'
              : 'Start exploring your database schemas'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'sign-up' && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-xs font-medium text-muted-foreground">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={fields.name}
                  onChange={(e) => update('name', e.target.value)}
                  required
                  disabled={loading}
                  className="auth-input"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="jane@example.com"
                value={fields.email}
                onChange={(e) => update('email', e.target.value)}
                required
                disabled={loading}
                className="auth-input"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                placeholder="••••••••"
                value={fields.password}
                onChange={(e) => update('password', e.target.value)}
                required
                minLength={8}
                disabled={loading}
                className="auth-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === 'sign-in' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : mode === 'sign-in' ? (
                'Sign in'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            {mode === 'sign-in' ? (
              <>
                {"Don't have an account? "}
                <Link href="/sign-up" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Link href="/sign-in" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          background: var(--secondary);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .auth-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px color-mix(in oklch, var(--primary) 20%, transparent);
        }
        .auth-input::placeholder {
          color: var(--muted-foreground);
        }
        .auth-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}
