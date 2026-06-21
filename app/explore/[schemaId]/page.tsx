import { auth } from '@/lib/auth'
import { getSchema } from '@/lib/schema-store'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { ERDExplorer } from '@/components/erd/erd-explorer'
import type { ParsedSchema } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ schemaId: string }>
}

export default async function ExplorePage({ params }: Props) {
  const { schemaId } = await params
  const headersList = await headers()
  const session = await auth.api.getSession({ headers: headersList })
  if (!session?.user?.id) redirect('/sign-in')

  const schema = await getSchema(schemaId)
  if (!schema || schema.userId !== session.user.id) redirect('/dashboard')

  return (
    <ERDExplorer
      name={schema.name}
      schemaId={schemaId}
      schema={schema.tablesJson as ParsedSchema}
      aiDocumentation={schema.aiDocsJson as Record<string, string> | null}
    />
  )
}
