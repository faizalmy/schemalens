'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Key } from 'lucide-react'

export interface TableNodeData {
  tableName: string
  columns: {
    name: string
    type: string
    nullable: boolean
    primaryKey: boolean
    defaultValue: string | null
    unique: boolean
  }[]
  rowEstimate: number | null
  selected?: boolean
}

function TableNodeComponent({ data, selected }: NodeProps<TableNodeData>) {
  const pkColumns = data.columns.filter((c) => c.primaryKey)
  const otherColumns = data.columns.filter((c) => !c.primaryKey)

  return (
    <div
      className={`rounded-lg border shadow-lg min-w-[200px] max-w-[280px] overflow-hidden transition-all ${
        selected
          ? 'border-primary shadow-primary/20 shadow-xl'
          : 'border-border hover:border-primary/40'
      }`}
      style={{ background: 'var(--card)' }}
    >
      {/* Table header */}
      <div
        className="px-3 py-2 border-b border-border flex items-center justify-between"
        style={{ background: 'var(--secondary)' }}
      >
        <span className="text-xs font-semibold text-foreground font-mono tracking-tight truncate">
          {data.tableName}
        </span>
        {data.rowEstimate !== null && data.rowEstimate > 0 && (
          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
            ~{data.rowEstimate.toLocaleString()} rows
          </span>
        )}
      </div>

      {/* Primary key columns */}
      {pkColumns.map((col) => (
        <ColumnRow key={col.name} col={col} isPk />
      ))}

      {/* Divider if both sections present */}
      {pkColumns.length > 0 && otherColumns.length > 0 && (
        <div className="border-t border-dashed border-border/50" />
      )}

      {/* Other columns */}
      {otherColumns.slice(0, 12).map((col) => (
        <ColumnRow key={col.name} col={col} />
      ))}

      {otherColumns.length > 12 && (
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/50">
          +{otherColumns.length - 12} more columns
        </div>
      )}

      {/* Handles for edges */}
      <Handle type="target" position={Position.Left} className="!opacity-0" />
      <Handle type="source" position={Position.Right} className="!opacity-0" />
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  )
}

function ColumnRow({
  col,
  isPk,
}: {
  col: TableNodeData['columns'][number]
  isPk?: boolean
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1 hover:bg-secondary/50 transition-colors group">
      <div className="w-3 shrink-0 flex items-center justify-center">
        {isPk ? (
          <Key className="w-2.5 h-2.5 text-primary" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-muted" />
        )}
      </div>
      <span
        className={`text-[11px] font-mono flex-1 truncate ${isPk ? 'text-primary font-medium' : 'text-foreground'}`}
      >
        {col.name}
      </span>
      <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-1">
        {col.type}
        {col.nullable ? '' : ' *'}
      </span>
    </div>
  )
}

export const TableNode = memo(TableNodeComponent)
