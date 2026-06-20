import Link from 'next/link'
import { ArrowRight, Database, GitBranch, Sparkles, Lock } from 'lucide-react'

export function HeroSection() {
  return (
    <main className="flex flex-col items-center">
      {/* Hero */}
      <section className="w-full max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-8">
          <Sparkles className="w-3 h-3" />
          Aurora PostgreSQL + AI Documentation
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-balance mb-6">
          Explore your database schema{' '}
          <span className="text-primary">visually</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty mb-10">
          Connect your AWS Aurora PostgreSQL database and get an instant, interactive
          entity-relationship diagram with AI-generated documentation — no setup required.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border text-muted-foreground font-medium hover:text-foreground hover:bg-secondary transition-colors text-sm"
          >
            View demo
          </Link>
        </div>
      </section>

      {/* Feature grid */}
      <section className="w-full max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Database className="w-5 h-5 text-primary" />}
            title="Instant ERD diagrams"
            description="Introspect your Aurora PostgreSQL schema and render a fully interactive entity-relationship diagram in seconds."
          />
          <FeatureCard
            icon={<GitBranch className="w-5 h-5 text-primary" />}
            title="Relationship mapping"
            description="Automatically detect and visualize foreign key relationships between tables with clear directional edges."
          />
          <FeatureCard
            icon={<Sparkles className="w-5 h-5 text-primary" />}
            title="AI documentation"
            description="Generate comprehensive, readable documentation for your entire schema using GPT-4o — one click."
          />
          <FeatureCard
            icon={<Lock className="w-5 h-5 text-primary" />}
            title="Secure connections"
            description="Credentials are used only at connection time and never stored. SSL/TLS support for all connections."
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            }
            title="Shareable links"
            description="Share a read-only view of any ERD diagram with your team using a secure, token-gated share link."
          />
          <FeatureCard
            icon={
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            }
            title="Multi-schema support"
            description="Connect multiple databases and switch between ERD snapshots to compare schemas side by side."
          />
        </div>
      </section>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="border border-border rounded-lg p-5 bg-card hover:border-primary/30 transition-colors group">
      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-medium text-foreground text-sm mb-1.5">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  )
}
