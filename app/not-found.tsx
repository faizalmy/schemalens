import Link from 'next/link'
import { Database, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
      <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
        <Database className="w-7 h-7 text-primary" />
      </div>
      <h1 className="text-3xl font-bold text-foreground mb-2">404</h1>
      <p className="text-base font-medium text-foreground mb-1">Page not found</p>
      <p className="text-sm text-muted-foreground max-w-xs mb-8">
        The schema or share link you&apos;re looking for doesn&apos;t exist or has been removed.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to SchemaLens
      </Link>
    </div>
  )
}
