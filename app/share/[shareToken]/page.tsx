import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { savedSchemas } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { SharedERDViewer } from '@/components/erd/shared-erd-viewer'
import type { ParsedSchema } from '@/lib/types'

interface Props {
  params: Promise<{ shareToken: string }>
}

export default async function SharePage({ params }: Props) {
  const { shareToken } = await params

  const result = await db
    .select({ name: savedSchemas.name, tablesJson: savedSchemas.tablesJson })
    .from(savedSchemas)
    .where(eq(savedSchemas.shareId, shareToken))
    .limit(1)

  const schema = result[0]
  if (!schema) notFound()

  return <SharedERDViewer name={schema.name} schema={schema.tablesJson as ParsedSchema} />
}
