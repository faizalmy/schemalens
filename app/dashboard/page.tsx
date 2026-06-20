import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listUserSchemas } from '@/lib/schema-store'
import { NavBar } from '@/components/nav-bar'
import { Dashboard } from '@/components/dashboard'

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')

  const schemas = await listUserSchemas(session.user.id)

  return (
    <div className="min-h-screen bg-background">
      <NavBar authed />
      <Dashboard schemas={schemas} userName={session.user.name ?? 'User'} />
    </div>
  )
}
