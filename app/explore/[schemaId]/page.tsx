import { getDummySchema } from '@/lib/dummy-data'
import { ERDExplorer } from '@/components/erd/erd-explorer'

interface Props {
  params: Promise<{ schemaId: string }>
}

export default async function ExplorePage({ params }: Props) {
  const { schemaId } = await params
  const { meta, schema, aiDocumentation } = getDummySchema(schemaId)

  return <ERDExplorer name={meta.name} schema={schema} aiDocumentation={aiDocumentation} />
}
