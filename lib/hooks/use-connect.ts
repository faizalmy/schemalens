import { useState } from "react";

interface ConnectionFields {
  name: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  connectionString: string;
}

const DEFAULT_FIELDS: ConnectionFields = {
  name: "",
  host: "localhost",
  port: "5432",
  database: "",
  username: "",
  password: "",
  connectionString: "",
};

/**
 * Parse a PostgreSQL connection URL into its components.
 * Supports formats:
 *   postgresql://user:pass@host:port/db
 *   postgres://user:pass@host:port/db
 *   postgresql://user:pass@host/db       (defaults port to 5432)
 */
export function parseConnectionString(
  url: string,
): {
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
} | null {
  // postgres[ql]://user:pass@host[:port]/db[?params]
  const RE =
    /^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+)(?::(\d+))?\/([^?]+)/;

  const m = url.match(RE);
  if (!m) return null;

  return {
    username: decodeURIComponent(m[1]),
    password: decodeURIComponent(m[2]),
    host: m[3],
    port: m[4] || "5432",
    database: decodeURIComponent(m[5]),
  };
}

/** Capitalize and clean up a database name for use as a display name. */
function humanizeDbName(db: string): string {
  return db
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function useConnect() {
  const [fields, setFields] = useState<ConnectionFields>(DEFAULT_FIELDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof ConnectionFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  /** Parse a connection string and fill all individual fields. */
  function fillFromUrl(url: string) {
    const parsed = parseConnectionString(url);
    if (parsed) {
      setFields((f) => ({
        ...f,
        ...parsed,
        connectionString: url,
        name: f.name || humanizeDbName(parsed.database),
      }));
    } else {
      // Still update the connectionString field so the user sees what they typed
      setFields((f) => ({ ...f, connectionString: url }));
    }
  }

  function buildConnectionString(): string {
    const { host, port, database, username, password } = fields;
    return `postgresql://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }

  async function submit(): Promise<string | null> {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/introspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionString: buildConnectionString(),
          name: fields.name,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        setError(body.error || "Connection failed");
        return null;
      }

      return body.schemaId;
    } catch (err: any) {
      setError(err.message || "Connection failed");
      return null;
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFields(DEFAULT_FIELDS);
    setError(null);
  }

  return { fields, loading, error, update, submit, reset, fillFromUrl };
}
