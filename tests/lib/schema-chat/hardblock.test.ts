/**
 * Hard-block validation tests for schema-chat SQL safety.
 * Tests the isReadOnly function against known bypass vectors.
 *
 * Run: npx tsx tests/lib/schema-chat/hardblock.test.ts
 */

function isReadOnly(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return false;

  const stripped = trimmed
    .replace(/'[^']*'/g, "")
    .replace(/"[^"]*"/g, "")
    .replace(/\$\$[\s\S]*?\$\$/g, "")
    .replace(/E'[^']*'/g, "");

  const semiCount = (stripped.match(/;/g) || []).length;
  if (semiCount > 1) return false;

  const normalized = trimmed.toUpperCase().trimStart();
  const isAllowedPrefix =
    normalized.startsWith("SELECT") ||
    normalized.startsWith("WITH") ||
    normalized.startsWith("EXPLAIN") ||
    normalized.startsWith("SHOW");

  if (!isAllowedPrefix) return false;

  const unsafePattern =
    /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|EXECUTE|CALL|MERGE|COPY|REINDEX|VACUUM|CLUSTER|REFRESH|SECURITY|SET\s+ROLE|SET\s+SESSION\s+AUTHORIZATION|LISTEN|NOTIFY)\b/i;

  if (unsafePattern.test(trimmed)) return false;

  if (/EXPLAIN\s+ANALYZE\s+(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE)/i.test(trimmed)) return false;

  return true;
}

let passed = 0;
let failed = 0;

function assert(name: string, query: string, expected: boolean) {
  const result = isReadOnly(query);
  const status = result === expected ? "PASS" : "FAIL";
  if (status === "PASS") passed++;
  else failed++;
  console.log(`  ${status}: ${name}`);
  if (status === "FAIL") {
    console.log(`       query: ${query.slice(0, 80)}`);
    console.log(`       expected: ${expected}, got: ${result}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

section("1. Valid read-only queries");
assert("simple SELECT", "SELECT * FROM users", true);
assert("SELECT with WHERE", "SELECT id, email FROM users WHERE active = true", true);
assert("SELECT with JOIN", "SELECT u.*, o.total FROM users u JOIN orders o ON o.user_id = u.id", true);
assert("CTE (WITH)", "WITH recent AS (SELECT * FROM orders WHERE created_at > now() - interval '30 days') SELECT * FROM recent", true);
assert("SELECT aggregate", "SELECT department, avg(salary) FROM employees GROUP BY department", true);
assert("SELECT subquery", "SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)", true);
assert("EXPLAIN SELECT", "EXPLAIN SELECT * FROM users", true);

section("2. Destructive keywords");
assert("INSERT", "INSERT INTO users (name) VALUES ('test')", false);
assert("UPDATE", "UPDATE users SET name = 'x' WHERE id = 1", false);
assert("DELETE", "DELETE FROM users WHERE id = 1", false);
assert("DROP TABLE", "DROP TABLE users", false);
assert("ALTER TABLE", "ALTER TABLE users ADD COLUMN x INT", false);
assert("TRUNCATE", "TRUNCATE users", false);
assert("CREATE TABLE", "CREATE TABLE x (id INT)", false);
assert("CREATE INDEX", "CREATE INDEX idx ON users (id)", false);
assert("GRANT", "GRANT ALL ON users TO public", false);
assert("REVOKE", "REVOKE ALL ON users FROM public", false);

section("3. Extended destructive keywords");
assert("EXECUTE", "EXECUTE some_function()", false);
assert("CALL", "CALL some_procedure()", false);
assert("MERGE", "MERGE INTO users USING ...", false);
assert("COPY FROM", "COPY users FROM '/tmp/data.csv'", false);
assert("VACUUM", "VACUUM", false);
assert("REINDEX", "REINDEX TABLE users", false);
assert("CLUSTER", "CLUSTER users USING idx", false);
assert("REFRESH MATERIALIZED VIEW", "REFRESH MATERIALIZED VIEW mv", false);
assert("NOTIFY", "NOTIFY channel, 'msg'", false);

section("4. Multi-statement injection");
assert("SELECT then INSERT", "SELECT 1; INSERT INTO users VALUES (1)", false);
assert("SELECT then DROP", "SELECT * FROM users; DROP TABLE users", false);
assert("semi in WHERE string OK", "SELECT * FROM users WHERE name = 'hello; world'", true);
assert("semi in double-quoted string OK", 'SELECT * FROM "users;test"', true);
assert("three statements", "SELECT 1; SELECT 2; SELECT 3", false);

section("5. Bypass attempts");
assert("inline INSERT in SELECT", "SELECT * FROM users; INSERT INTO users VALUES (1)", false);
assert("CTE with INSERT", "WITH x AS (INSERT INTO users VALUES (1) RETURNING *) SELECT * FROM x", false);
assert("INSERT with dollar quotes", "INSERT INTO users VALUES ($$abc$$)", false);
assert("comment-obfuscated INSERT", "SELECT 1 /*! INSERT INTO users */", false);
assert("lowercase delete", "delete from users", false);
assert("mixed-case Delete", "Delete FROM users", false);
assert("SET ROLE escalation", "SET ROLE admin", false);
assert("SET SESSION AUTHORIZATION", "SET SESSION AUTHORIZATION superuser", false);
assert("SECURITY LABEL", "SECURITY LABEL FOR 'x' ON TABLE users IS 'y'", false);

section("6. EXPLAIN ANALYZE danger");
assert("EXPLAIN ANALYZE INSERT", "EXPLAIN ANALYZE INSERT INTO users VALUES (1)", false);
assert("EXPLAIN ANALYZE UPDATE", "EXPLAIN ANALYZE UPDATE users SET name = 'x'", false);
assert("EXPLAIN ANALYZE DELETE", "EXPLAIN ANALYZE DELETE FROM users", false);
assert("EXPLAIN ANALYZE DROP", "EXPLAIN ANALYZE DROP TABLE users", false);
assert("EXPLAIN ANALYZE SELECT OK", "EXPLAIN ANALYZE SELECT * FROM users", true);

section("7. Edge cases");
assert("empty string", "", false);
assert("whitespace only", "   ", false);
assert("just a comment", "-- this is a comment", false);

section("Summary");
const total = passed + failed;
console.log(`  Total:  ${total}`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Rate:   ${(passed / total * 100).toFixed(1)}%`);
process.exit(failed > 0 ? 1 : 0);
