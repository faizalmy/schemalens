import { NavBar } from '@/components/nav-bar'
import { Dashboard } from '@/components/dashboard'
import { dummySchemas } from '@/lib/dummy-data'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar authed />
      <Dashboard schemas={dummySchemas} userName="Jane Smith" />
    </div>
  )
}
