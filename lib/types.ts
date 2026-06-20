export interface TableColumn {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
  defaultValue: string | null
  unique: boolean
}

export interface TableRelation {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
  constraintName: string
}

export interface TableInfo {
  name: string
  columns: TableColumn[]
  rowEstimate: number | null
}

export interface ParsedSchema {
  tables: TableInfo[]
  relations: TableRelation[]
}

export interface SchemaMeta {
  id: string
  name: string
  host: string
  database: string
  tableCount: number
  relationCount: number
  createdAt: Date
}

export interface SchemaListItem {
  id: string
  name: string
  tableCount: number
  relationCount: number
  createdAt: Date
}
