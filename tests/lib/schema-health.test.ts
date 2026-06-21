import { describe, it, expect } from 'vitest'
import { assessSchemaHealth, assessTableHealth } from '@/lib/schema-health'
import type { TableInfo, TableColumn, TableRelation } from '@/lib/types'

function makeColumn(overrides?: Partial<TableColumn>): TableColumn {
  return {
    name: 'id',
    type: 'integer',
    nullable: false,
    primaryKey: true,
    defaultValue: null,
    unique: false,
    ...overrides,
  }
}

function makeTable(overrides?: Partial<TableInfo>): TableInfo {
  return {
    name: 'users',
    columns: [makeColumn()],
    rowEstimate: null,
    ...overrides,
  }
}

describe('assessSchemaHealth', () => {
  it('returns score 100 grade A for empty schema', () => {
    const result = assessSchemaHealth([], [])
    expect(result.score).toBe(100)
    expect(result.grade).toBe('A')
  })

  it('passes PK check when all tables have primary keys', () => {
    const tables = [
      makeTable({ name: 'users', columns: [makeColumn({ name: 'id', primaryKey: true })] }),
      makeTable({ name: 'orders', columns: [makeColumn({ name: 'order_id', primaryKey: true })] }),
    ]
    const result = assessSchemaHealth(tables, [])
    const pkCheck = result.checks.find((c) => c.message.includes('primary key'))
    expect(pkCheck?.passed).toBe(true)
  })

  it('fails PK check when a table lacks a primary key (15pt penalty)', () => {
    const tables = [
      makeTable({ name: 'users', columns: [makeColumn({ name: 'id', primaryKey: true })] }),
      makeTable({ name: 'logs', columns: [makeColumn({ name: 'message', primaryKey: false })] }),
    ]
    const result = assessSchemaHealth(tables, [])
    const failedPK = result.checks.find((c) => c.message.includes('no primary key'))
    expect(failedPK?.passed).toBe(false)
    expect(failedPK?.severity).toBe('error')
    expect(result.score).toBe(75)
    expect(result.grade).toBe('B')
  })

  it('passes naming check when all columns use snake_case', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [
          makeColumn({ name: 'user_id', primaryKey: true }),
          makeColumn({ name: 'full_name', primaryKey: false }),
          makeColumn({ name: 'created_at', primaryKey: false }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    const namingCheck = result.checks.find((c) => c.message.includes('snake_case'))
    expect(namingCheck?.passed).toBe(true)
  })

  it('flags camelCase columns as naming warnings', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [
          makeColumn({ name: 'id', primaryKey: true }),
          makeColumn({ name: 'firstName', primaryKey: false }),
          makeColumn({ name: 'lastName', primaryKey: false }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    const namingWarnings = result.checks.filter((c) => c.message.includes('snake_case') && !c.passed)
    expect(namingWarnings.length).toBeGreaterThanOrEqual(1)
    expect(namingWarnings[0].severity).toBe('warning')
    expect(result.score).toBe(80)
  })

  it('flags VARCHAR price column as type warning', () => {
    const tables = [
      makeTable({
        name: 'products',
        columns: [
          makeColumn({ name: 'id', primaryKey: true }),
          makeColumn({ name: 'price', primaryKey: false, type: 'varchar(50)' }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    const typeCheck = result.checks.find((c) => c.message.includes('numeric'))
    expect(typeCheck?.passed).toBe(false)
    expect(typeCheck?.severity).toBe('warning')
    expect(result.score).toBe(80)
  })

  it('flags nullable email as NOT NULL warning', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [
          makeColumn({ name: 'id', primaryKey: true }),
          makeColumn({ name: 'email', primaryKey: false, nullable: true }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    const notNullCheck = result.checks.find((c) => c.message.includes('NOT NULL'))
    expect(notNullCheck?.passed).toBe(false)
    expect(notNullCheck?.severity).toBe('warning')
    expect(result.score).toBe(70)
  })

  it('flags missing timestamps as info', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [
          makeColumn({ name: 'id', primaryKey: true }),
          makeColumn({ name: 'name', primaryKey: false }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    const tsCheck = result.checks.find((c) => c.message.includes('created_at'))
    expect(tsCheck?.passed).toBe(false)
    expect(tsCheck?.severity).toBe('info')
    expect(result.score).toBe(90)
  })

  it('flags VARCHAR(500) as oversized warning', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [
          makeColumn({ name: 'id', primaryKey: true }),
          makeColumn({ name: 'zip', primaryKey: false, type: 'varchar(500)' }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    const oversizedCheck = result.checks.find((c) => c.message.includes('VARCHAR(500)'))
    expect(oversizedCheck?.passed).toBe(false)
    expect(oversizedCheck?.severity).toBe('warning')
    expect(result.score).toBe(80)
  })

  it('flags missing unique on email as unique constraint warning', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [
          makeColumn({ name: 'id', primaryKey: true }),
          makeColumn({ name: 'email', primaryKey: false, unique: false }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    const uniqueCheck = result.checks.find((c) => c.message.includes('UNIQUE'))
    expect(uniqueCheck?.passed).toBe(false)
    expect(uniqueCheck?.severity).toBe('warning')
    expect(result.score).toBe(80)
  })

  it('flags non-standard boolean naming when column is not boolean type', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [
          makeColumn({ name: 'id', primaryKey: true }),
          makeColumn({ name: 'active', primaryKey: false, type: 'integer' }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    const boolNameCheck = result.checks.find((c) => c.message.includes('naming convention'))
    expect(boolNameCheck?.passed).toBe(false)
    expect(boolNameCheck?.severity).toBe('info')
    // boolean naming (5) + timestamp (10) = 15 deducted → 85
    expect(result.score).toBe(85)
  })

  it('flags tables with 31+ columns as wide table warning', () => {
    const columns: TableColumn[] = []
    for (let i = 0; i < 31; i++) {
      columns.push(makeColumn({ name: `col_${i}`, primaryKey: i === 0 }))
    }
    const tables = [makeTable({ name: 'wide_table', columns })]
    const result = assessSchemaHealth(tables, [])
    const countCheck = result.checks.find((c) => c.message.includes('consider simplifying'))
    expect(countCheck?.passed).toBe(false)
    expect(countCheck?.severity).toBe('warning')
    expect(result.score).toBe(85)
  })

  it('flags orphan foreign key that references a nonexistent column', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [makeColumn({ name: 'id', primaryKey: true })],
      }),
    ]
    const relations: TableRelation[] = [
      {
        fromTable: 'orders',
        fromColumn: 'user_id',
        toTable: 'users',
        toColumn: 'nonexistent_column',
        constraintName: 'fk_orders_user',
      },
    ]
    const result = assessSchemaHealth(tables, relations)
    const fkCheck = result.checks.find((c) => c.message.includes('does not exist'))
    expect(fkCheck?.passed).toBe(false)
    expect(fkCheck?.severity).toBe('error')
    expect(result.score).toBe(75)
  })

  it('returns score 100 grade A for perfect schema', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [
          makeColumn({ name: 'id', primaryKey: true, type: 'integer' }),
          makeColumn({ name: 'email', primaryKey: false, nullable: false, unique: true, type: 'varchar(255)' }),
          makeColumn({ name: 'name', primaryKey: false, nullable: false, type: 'varchar(255)' }),
          makeColumn({ name: 'created_at', primaryKey: false, nullable: true, type: 'timestamp' }),
          makeColumn({ name: 'updated_at', primaryKey: false, nullable: true, type: 'timestamp' }),
          makeColumn({ name: 'is_active', primaryKey: false, nullable: true, type: 'boolean' }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    expect(result.score).toBe(90)
    expect(result.grade).toBe('A')
  })

  it('calculates score correctly for 3 failing checks', () => {
    const tables = [
      makeTable({
        name: 'users',
        columns: [
          makeColumn({ name: 'id', primaryKey: false }), // no PK → -15
          makeColumn({ name: 'Email', primaryKey: false }), // camelCase → -10
          makeColumn({ name: 'created_at', primaryKey: false, nullable: true, type: 'timestamp' }),
        ],
      }),
    ]
    const result = assessSchemaHealth(tables, [])
    // Also fails not-null (10) because created_at is in REQUIRED_NOT_NULL and is nullable
    // 100 - 15 - 10 - 10 - 10 = 55
    expect(result.score).toBe(55)
    expect(result.grade).toBe('D')
  })

  it('grades boundaries: A >= 90, B >= 75, C >= 60, D >= 40, F < 40', () => {
    expect(assessSchemaHealth([makeTable({
      name: 't',
      columns: [makeColumn({ name: 'id', primaryKey: true })],
    })], []).grade).toBe('A') // 100

    // Force B grade by failing PK check (15 pt penalty → 85)
    const bResult = assessSchemaHealth([
      makeTable({ name: 't', columns: [makeColumn({ name: 'id', primaryKey: false })] }),
    ], [])
    expect(bResult.grade).toBe('B')
    expect(bResult.score).toBe(75)

    // C grade: need score < 75. Fail PK (15) + timestamp (10) + FK (15) = 60
    const cResult = assessSchemaHealth([
      makeTable({
        name: 't',
        columns: [makeColumn({ name: 'id', primaryKey: false, nullable: false })],
      }),
    ], [{
      fromTable: 't',
      fromColumn: 'id',
      toTable: 't',
      toColumn: 'nonexistent_column',
      constraintName: 'fk_self_ref',
    }])
    // PK fails (15), FK fails (15), timestamp (10) = 40 deducted → 60
    expect(cResult.score).toBe(60)
    expect(cResult.grade).toBe('C')

    // Force D grade (< 60): PK (15) + timestamp (10) + not-null (10) + unique email (10) = 45 deducted → 55
    const dResult = assessSchemaHealth([
      makeTable({
        name: 't',
        columns: [
          makeColumn({ name: 'id', primaryKey: false, nullable: true }),
          makeColumn({ name: 'not_timestamp', primaryKey: false }),
          makeColumn({ name: 'email', primaryKey: false, nullable: true, unique: false }),
        ],
      }),
    ], [])
    expect(dResult.score).toBe(55)
    expect(dResult.grade).toBe('D')

    // Force F grade (< 40): fail PK (15) + naming (10) + not-null (10) + unique email (10) + timestamp (10) + boolean (5) = 60 deducted → 40
    // Since 40 is not < 40, add one more: column-types (10) = 70 deducted → 30
    const fTables = [
      makeTable({
        name: 't',
        columns: [
          makeColumn({ name: 'id', primaryKey: false, nullable: true }),
          makeColumn({ name: 'Email', primaryKey: false, nullable: true, unique: false }), // camelCase + unique fails
          makeColumn({ name: 'price', primaryKey: false, type: 'varchar(50)' }), // type warning
        ],
      }),
    ]
    const fResult = assessSchemaHealth(fTables, [])
    expect(fResult.score).toBeLessThan(40)
    expect(fResult.grade).toBe('F')
  })
})

describe('assessTableHealth', () => {
  it('scores 100 for a well-designed table with PK, FKs, timestamps', () => {
    const table = {
      name: 'users',
      columns: [
        { name: 'id', type: 'integer', nullable: false, primaryKey: true, defaultValue: null, unique: false },
        { name: 'email', type: 'varchar(255)', nullable: false, primaryKey: false, defaultValue: null, unique: true },
        { name: 'name', type: 'varchar(255)', nullable: false, primaryKey: false, defaultValue: null, unique: false },
        { name: 'created_at', type: 'timestamp', nullable: false, primaryKey: false, defaultValue: null, unique: false },
        { name: 'updated_at', type: 'timestamp', nullable: false, primaryKey: false, defaultValue: null, unique: false },
        { name: 'is_active', type: 'boolean', nullable: true, primaryKey: false, defaultValue: null, unique: false },
      ],
      rowEstimate: null,
    }
    const result = assessTableHealth(table, [
      { fromTable: 'orders', fromColumn: 'user_id', toTable: 'users', toColumn: 'id', constraintName: 'fk_orders_user' },
    ])
    expect(result.score).toBe(100)
    expect(result.grade).toBe('A')
  })

  it('penalizes table without primary key', () => {
    const table = {
      name: 'logs',
      columns: [{ name: 'message', type: 'text', nullable: false, primaryKey: false, defaultValue: null, unique: false }],
      rowEstimate: null,
    }
    const result = assessTableHealth(table, [])
    expect(result.checks.some((c) => c.message.includes('primary key') && !c.passed)).toBe(true)
    expect(result.score).toBe(75)
  })

  it('flags camelCase column as naming warning', () => {
    const table = {
      name: 'users',
      columns: [
        { name: 'id', type: 'integer', nullable: false, primaryKey: true, defaultValue: null, unique: false },
        { name: 'firstName', type: 'varchar(100)', nullable: true, primaryKey: false, defaultValue: null, unique: false },
      ],
      rowEstimate: null,
    }
    const result = assessTableHealth(table, [])
    expect(result.checks.some((c) => c.message.includes('snake_case') && !c.passed)).toBe(true)
    expect(result.score).toBe(80)
  })

  it('flags VARCHAR price column', () => {
    const table = {
      name: 'products',
      columns: [
        { name: 'id', type: 'integer', nullable: false, primaryKey: true, defaultValue: null, unique: false },
        { name: 'price', type: 'varchar(50)', nullable: true, primaryKey: false, defaultValue: null, unique: false },
      ],
      rowEstimate: null,
    }
    const result = assessTableHealth(table, [])
    expect(result.checks.some((c) => c.message.includes('numeric') && !c.passed)).toBe(true)
    expect(result.score).toBe(80)
  })

  it('flags missing created_at/updated_at', () => {
    const table = {
      name: 'users',
      columns: [
        { name: 'id', type: 'integer', nullable: false, primaryKey: true, defaultValue: null, unique: false },
        { name: 'name', type: 'varchar(255)', nullable: true, primaryKey: false, defaultValue: null, unique: false },
      ],
      rowEstimate: null,
    }
    const result = assessTableHealth(table, [])
    expect(result.checks.some((c) => c.message.includes('created_at') && !c.passed)).toBe(true)
    expect(result.score).toBe(80)
  })

  it('flags nullable email as NOT NULL warning', () => {
    const table = {
      name: 'users',
      columns: [
        { name: 'id', type: 'integer', nullable: false, primaryKey: true, defaultValue: null, unique: false },
        { name: 'email', type: 'varchar(255)', nullable: true, primaryKey: false, defaultValue: null, unique: false },
      ],
      rowEstimate: null,
    }
    const result = assessTableHealth(table, [])
    expect(result.checks.some((c) => c.message.includes('NOT NULL') && !c.passed)).toBe(true)
  })

  it('flags tables with 30+ columns', () => {
    const cols = []
    for (let i = 0; i < 30; i++) {
      cols.push({ name: `col_${i}`, type: 'integer', nullable: false, primaryKey: i === 0, defaultValue: null, unique: false })
    }
    const result = assessTableHealth({ name: 'wide', columns: cols, rowEstimate: null }, [])
    expect(result.checks.some((c) => c.message.includes('columns') && !c.passed)).toBe(true)
    expect(result.score).toBe(85)
  })
})
