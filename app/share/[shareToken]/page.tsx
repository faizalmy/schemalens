import { getDummySchema } from '@/lib/dummy-data'
import { SharedERDViewer } from '@/components/erd/shared-erd-viewer'

interface Props {
  params: Promise<{ shareToken: string }>
}

export default async function SharePage({ params }: Props) {
  // Frontend-only demo: every share link resolves to the sample schema.
  await params
  const { meta, schema } = getDummySchema('prod-ecommerce')

  return <SharedERDViewer name={meta.name} schema={schema} />
}
