import { notFound } from 'next/navigation'
import { SharedERDViewer } from '@/components/erd/shared-erd-viewer'
import type { ParsedSchema } from '@/lib/types'

interface Props {
  params: Promise<{ shareToken: string }>
}

export default async function SharePage({ params }: Props) {
  const { shareToken } = await params

  // Use relative URL — works on both localhost and Vercel
  const res = await fetch(`/api/share/${shareToken}`, { cache: 'no-store' })

  if (!res.ok) notFound()

  const data = await res.json()

  return <SharedERDViewer name={data.name} schema={data.tablesJson as ParsedSchema} />
}
