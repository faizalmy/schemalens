import { NavBar } from '@/components/nav-bar'
import { HeroSection } from '@/components/hero-section'

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <HeroSection />
    </div>
  )
}
