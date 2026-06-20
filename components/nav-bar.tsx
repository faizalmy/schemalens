'use client'

import Link from 'next/link'
import { LogOut, Database } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export function NavBar() {
  const router = useRouter()
  const { data: session } = authClient.useSession()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/')
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Database className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground tracking-tight">SchemaLens</span>
        </Link>

        <nav className="flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:block">{session.user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-secondary"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="sr-only sm:not-sr-only">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-secondary"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-sm text-primary-foreground bg-primary hover:bg-primary/90 transition-colors px-3 py-1.5 rounded-md font-medium"
              >
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
