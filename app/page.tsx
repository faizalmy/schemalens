import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { NavBar } from '@/components/nav-bar'
import { HeroSection } from '@/components/hero-section'

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <HeroSection />
    </div>
  )
}
