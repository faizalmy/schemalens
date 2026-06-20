import { ERDExplorer } from '@/components/erd/erd-explorer'
import { getDummySchema } from '@/lib/dummy-data'

export default function DemoPage() {
  const { schema } = getDummySchema('prod-ecommerce')
  return (
    <ERDExplorer
      name="Demo — Storefront E-commerce"
      schemaId="prod-ecommerce"
      schema={schema}
      aiDocumentation={null}
    />
  )
}
