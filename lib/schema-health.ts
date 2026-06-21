import type { TableColumn, TableRelation, TableInfo } from '@/lib/types'

export interface HealthCheckResult {
  passed: boolean
  message: string
  severity: 'error' | 'warning' | 'info'
  tableName?: string
  columnName?: string
  suggestion?: string
}

export interface HealthResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: HealthCheckResult[]
  passedCategories: number
  totalCategories: number
}

interface CheckFnResult {
  passed: boolean
  findings: HealthCheckResult[]
}

function getGrade(score: number): HealthResult['grade'] {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

function checkPrimaryKey(tables: TableInfo[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const table of tables) {
    const hasPK = table.columns.some((c) => c.primaryKey)
    if (!hasPK) {
      passed = false
      findings.push({
        passed: false,
        message: `Table "${table.name}" has no primary key`,
        severity: 'error',
        tableName: table.name,
        suggestion: 'Add a primary key column to uniquely identify each row',
      })
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'All tables have primary keys',
      severity: 'info',
    })
  }

  return { passed, findings }
}

function checkForeignKeys(tables: TableInfo[], relations: TableRelation[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const rel of relations) {
    const toTable = tables.find((t) => t.name === rel.toTable)
    // Skip if the referenced table is not in our introspected set
    // (it may be a system table or external reference we can't verify)
    if (!toTable) continue

    const toColumn = toTable.columns.find((c) => c.name === rel.toColumn)
    if (!toColumn) {
      passed = false
      findings.push({
        passed: false,
        message: `Relation references column "${rel.toColumn}" in table "${rel.toTable}" which does not exist`,
        severity: 'error',
        tableName: rel.toTable,
        columnName: rel.toColumn,
        suggestion: `Add column "${rel.toColumn}" to table "${rel.toTable}" or fix the relation`,
      })
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'All foreign key references are valid',
      severity: 'info',
    })
  }

  return { passed, findings }
}

const SNAKE_CASE_RE = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

function checkNamingConvention(tables: TableInfo[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const table of tables) {
    for (const col of table.columns) {
      if (!SNAKE_CASE_RE.test(col.name)) {
        passed = false
        findings.push({
          passed: false,
          message: `Column "${col.name}" in table "${table.name}" does not use snake_case`,
          severity: 'warning',
          tableName: table.name,
          columnName: col.name,
          suggestion: `Rename "${col.name}" to its snake_case equivalent (e.g., "${toSnakeCase(col.name)}")`,
        })
      }
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'All column names follow snake_case',
      severity: 'info',
    })
  }

  return { passed, findings }
}

const NUMERIC_KEYWORDS = ['price', 'amount', 'cost', 'salary', 'total', 'balance', 'fee']
const TEXT_TO_VARCHAR_COLUMNS = ['id', 'email', 'phone', 'url', 'status']

function checkColumnTypes(tables: TableInfo[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const table of tables) {
    for (const col of table.columns) {
      const typeLower = col.type.toLowerCase()
      const nameLower = col.name.toLowerCase()

      const isTextOrVarchar = typeLower.includes('varchar') || typeLower.includes('text')

      if (isTextOrVarchar && NUMERIC_KEYWORDS.some((kw) => nameLower.includes(kw))) {
        passed = false
        findings.push({
          passed: false,
          message: `Column "${col.name}" in table "${table.name}" is "${col.type}" but name suggests it should be numeric`,
          severity: 'warning',
          tableName: table.name,
          columnName: col.name,
          suggestion: `Change "${col.name}" to a numeric type (e.g., DECIMAL, INTEGER, BIGINT)`,
        })
      }

      if (typeLower === 'text' && TEXT_TO_VARCHAR_COLUMNS.some((n) => nameLower === n)) {
        passed = false
        findings.push({
          passed: false,
          message: `Column "${col.name}" in table "${table.name}" uses TEXT instead of VARCHAR`,
          severity: 'info',
          tableName: table.name,
          columnName: col.name,
          suggestion: 'Use VARCHAR with an appropriate length limit instead of TEXT',
        })
      }
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'Column types are appropriate for their names',
      severity: 'info',
    })
  }

  return { passed, findings }
}

const REQUIRED_NOT_NULL_COLUMNS = ['id', 'email', 'name', 'username', 'created_at', 'updated_at']

function checkNotNull(tables: TableInfo[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const table of tables) {
    for (const col of table.columns) {
      if (col.nullable && REQUIRED_NOT_NULL_COLUMNS.includes(col.name.toLowerCase())) {
        passed = false
        findings.push({
          passed: false,
          message: `Column "${col.name}" in table "${table.name}" is nullable but should be NOT NULL`,
          severity: 'warning',
          tableName: table.name,
          columnName: col.name,
          suggestion: `Add NOT NULL constraint to "${col.name}"`,
        })
      }
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'All required columns have NOT NULL constraints',
      severity: 'info',
    })
  }

  return { passed, findings }
}

function checkTimestamps(tables: TableInfo[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const table of tables) {
    const colNames = table.columns.map((c) => c.name.toLowerCase())
    const hasCreatedAt = colNames.includes('created_at')
    const hasUpdatedAt = colNames.includes('updated_at')

    if (!hasCreatedAt && !hasUpdatedAt) {
      passed = false
      findings.push({
        passed: false,
        message: `Table "${table.name}" is missing both created_at and updated_at columns`,
        severity: 'info',
        tableName: table.name,
        suggestion: 'Add created_at and updated_at timestamp columns for auditing',
      })
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'All tables have timestamp conventions',
      severity: 'info',
    })
  }

  return { passed, findings }
}

const VARCHAR_PATTERN = /varchar\s*\(\s*(\d+)\s*\)/i

function checkOversizedColumns(tables: TableInfo[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const table of tables) {
    for (const col of table.columns) {
      const match = col.type.match(VARCHAR_PATTERN)
      if (match) {
        const length = parseInt(match[1], 10)
        if (length > 255) {
          passed = false
          findings.push({
            passed: false,
            message: `Column "${col.name}" in table "${table.name}" is VARCHAR(${length}) which exceeds 255 characters`,
            severity: 'warning',
            tableName: table.name,
            columnName: col.name,
            suggestion: `Reduce VARCHAR(${length}) to VARCHAR(255) or use TEXT if unbounded`,
          })
        }
      }

      if (col.type.toLowerCase() === 'text' && col.primaryKey) {
        passed = false
        findings.push({
          passed: false,
          message: `Column "${col.name}" in table "${table.name}" is a TEXT primary key`,
          severity: 'info',
          tableName: table.name,
          columnName: col.name,
          suggestion: 'Use a more efficient type (e.g., UUID, BIGINT) for primary keys',
        })
      }
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'No oversized columns detected',
      severity: 'info',
    })
  }

  return { passed, findings }
}

const NATURAL_KEY_COLUMNS = ['email', 'username', 'slug', 'phone']

function checkUniqueConstraints(tables: TableInfo[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const table of tables) {
    for (const col of table.columns) {
      if (NATURAL_KEY_COLUMNS.includes(col.name.toLowerCase()) && !col.unique && !col.primaryKey) {
        passed = false
        findings.push({
          passed: false,
          message: `Column "${col.name}" in table "${table.name}" should have a UNIQUE constraint`,
          severity: 'warning',
          tableName: table.name,
          columnName: col.name,
          suggestion: `Add a UNIQUE constraint to "${col.name}"`,
        })
      }
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'Natural key columns have unique constraints',
      severity: 'info',
    })
  }

  return { passed, findings }
}

const BOOLEAN_PREFIXES = ['is_', 'has_', 'can_', 'should_', 'will_', 'did_', 'does_', 'was_', 'are_']
const NON_STANDARD_BOOLEAN_NAMES = ['active', 'deleted', 'enabled', 'disabled', 'visible', 'hidden', 'archived', 'locked', 'verified', 'confirmed', 'published', 'draft', 'approved', 'pending', 'completed', 'failed', 'success']

function isBooleanLike(name: string): boolean {
  const lower = name.toLowerCase()
  return BOOLEAN_PREFIXES.some((p) => lower.startsWith(p)) || NON_STANDARD_BOOLEAN_NAMES.includes(lower)
}

function checkBooleanNaming(tables: TableInfo[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const table of tables) {
    for (const col of table.columns) {
      const typeLower = col.type.toLowerCase()
      const nameLower = col.name.toLowerCase()

      const isTypeBoolean = typeLower.includes('bool') || typeLower === 'boolean'
      const isNameBoolean = isBooleanLike(col.name)

      if (!isTypeBoolean && !isNameBoolean) continue

      if (isNameBoolean && !nameLower.startsWith('is_') && !isTypeBoolean) {
        passed = false
        findings.push({
          passed: false,
          message: `Column "${col.name}" in table "${table.name}" has a non-standard boolean naming convention`,
          severity: 'info',
          tableName: table.name,
          columnName: col.name,
          suggestion: `Rename "${col.name}" to use an "is_" prefix (e.g., "is_${nameLower}")`,
        })
      }

      if ((isTypeBoolean || isNameBoolean) && (typeLower.includes('int') || typeLower.includes('varchar') || typeLower === 'text')) {
        passed = false
        findings.push({
          passed: false,
          message: `Column "${col.name}" in table "${table.name}" is boolean-like but stored as "${col.type}"`,
          severity: 'warning',
          tableName: table.name,
          columnName: col.name,
          suggestion: `Use BOOLEAN type for "${col.name}" instead of "${col.type}"`,
        })
      }
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'Boolean naming and types follow conventions',
      severity: 'info',
    })
  }

  return { passed, findings }
}

function checkColumnCount(tables: TableInfo[]): CheckFnResult {
  const findings: HealthCheckResult[] = []
  let passed = true

  for (const table of tables) {
    const colCount = table.columns.length
    if (colCount >= 50) {
      passed = false
      findings.push({
        passed: false,
        message: `Table "${table.name}" has ${colCount} columns — consider splitting into multiple tables`,
        severity: 'error',
        tableName: table.name,
        suggestion: 'Consider normalizing this table into multiple related tables',
      })
    } else if (colCount >= 30) {
      passed = false
      findings.push({
        passed: false,
        message: `Table "${table.name}" has ${colCount} columns — consider simplifying`,
        severity: 'warning',
        tableName: table.name,
        suggestion: 'Consider splitting into multiple tables or reviewing column necessity',
      })
    }
  }

  if (passed) {
    findings.push({
      passed: true,
      message: 'All tables have a reasonable column count',
      severity: 'info',
    })
  }

  return { passed, findings }
}

interface CheckDefinition {
  name: string
  weight: number
  fn: (tables: TableInfo[], relations: TableRelation[]) => CheckFnResult
}

const CHECKS: CheckDefinition[] = [
  { name: 'primary-key', weight: 15, fn: checkPrimaryKey },
  { name: 'foreign-key', weight: 15, fn: checkForeignKeys },
  { name: 'naming', weight: 10, fn: checkNamingConvention },
  { name: 'column-types', weight: 10, fn: checkColumnTypes },
  { name: 'not-null', weight: 10, fn: checkNotNull },
  { name: 'timestamp', weight: 10, fn: checkTimestamps },
  { name: 'oversized', weight: 10, fn: checkOversizedColumns },
  { name: 'unique', weight: 10, fn: checkUniqueConstraints },
  { name: 'boolean', weight: 5, fn: checkBooleanNaming },
  { name: 'column-count', weight: 5, fn: checkColumnCount },
]

export function assessSchemaHealth(
  tables: TableInfo[],
  relations: TableRelation[],
): HealthResult {
  let score = 100
  const allChecks: HealthCheckResult[] = []
  let passedCategories = 0
  const totalCategories = CHECKS.length

  for (const check of CHECKS) {
    const result = check.fn(tables, relations)
    allChecks.push(...result.findings)
    if (!result.passed) {
      score -= check.weight
    } else {
      passedCategories++
    }
  }

  score = Math.max(0, score)
  const grade = getGrade(score)

  return {
    score,
    grade,
    checks: allChecks,
    passedCategories,
    totalCategories,
  }
}

export interface TableHealthResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  checks: HealthCheckResult[]
  passedCategories: number
  totalCategories: number
}

export function assessTableHealth(
  table: TableInfo,
  allRelations: TableRelation[],
): TableHealthResult {
  const tables = [table]
  let score = 100
  const allChecks: HealthCheckResult[] = []
  let passedCategories = 0
  const totalCategories = CHECKS.length

  for (const check of CHECKS) {
    const result = check.fn(tables, allRelations)
    allChecks.push(...result.findings)
    if (!result.passed) {
      score -= check.weight
    } else {
      passedCategories++
    }
  }

  score = Math.max(0, score)
  const grade = getGrade(score)

  return { score, grade, checks: allChecks, passedCategories, totalCategories }
}
