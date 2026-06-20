import { notFound } from 'next/navigation'
import { SharedERDViewer } from '@/components/erd/shared-erd-viewer'
import type { ParsedSchema } from '@/lib/types'

interface Props {
  params: Promise<{ shareToken: string }>
}

export default async function SharePage({ params }: Props) {
  const { shareToken } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/share/${shareToken}`, { cache: 'no-store' })

  if (!res.ok) notFound()

  const data = await res.json()

  return <SharedERDViewer name={data.name} schema={data.tablesJson as ParsedSchema} />
}
