'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { TableNode, type TableNodeData } from './table-node'
import type { ParsedSchema } from '@/lib/types'

const nodeTypes = { tableNode: TableNode }

function layoutNodes(tables: ParsedSchema['tables']): Node<TableNodeData>[] {
  const COLS = Math.ceil(Math.sqrt(tables.length))
  const COL_W = 320
  const ROW_H = 300

  return tables.map((table, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    return {
      id: table.name,
      type: 'tableNode',
      position: { x: col * COL_W + (row % 2 === 0 ? 0 : COL_W / 4), y: row * ROW_H },
      data: {
        tableName: table.name,
        columns: table.columns,
        rowEstimate: table.rowEstimate,
      },
    }
  })
}

function buildEdges(relations: ParsedSchema['relations']): Edge[] {
  return relations.map((r, i) => ({
    id: `edge-${i}-${r.constraintName}`,
    source: r.fromTable,
    target: r.toTable,
    sourceHandle: null,
    targetHandle: null,
    type: 'smoothstep',
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 12,
      height: 12,
      color: 'var(--primary)',
    },
    style: { stroke: 'var(--primary)', strokeWidth: 1.5, opacity: 0.6 },
    label: `${r.fromColumn} → ${r.toColumn}`,
    labelStyle: { fontSize: 9, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' },
    labelBgStyle: { fill: 'var(--card)', fillOpacity: 0.9 },
  }))
}

interface ERDCanvasProps {
  schema: ParsedSchema
  onTableSelect: (tableName: string | null) => void
}

export function ERDCanvas({ schema, onTableSelect }: ERDCanvasProps) {
  const initialNodes = useMemo(() => layoutNodes(schema.tables), [schema])
  const initialEdges = useMemo(() => buildEdges(schema.relations), [schema])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onTableSelect(node.id)
    },
    [onTableSelect]
  )

  const onPaneClick = useCallback(() => {
    onTableSelect(null)
  }, [onTableSelect])

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--border)"
        />
        <Controls />
        <MiniMap
          nodeColor={() => 'var(--secondary)'}
          maskColor="rgba(0,0,0,0.4)"
          zoomable
          pannable
        />
      </ReactFlow>
    </div>
  )
}
