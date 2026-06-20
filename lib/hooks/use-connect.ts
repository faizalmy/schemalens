import { useState } from "react";

interface ConnectionFields {
  name: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
}

const DEFAULT_FIELDS: ConnectionFields = {
  name: "",
  host: "localhost",
  port: "5432",
  database: "",
  username: "",
  password: "",
};

export function useConnect() {
  const [fields, setFields] = useState<ConnectionFields>(DEFAULT_FIELDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: keyof ConnectionFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setError(null);
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

  return { fields, loading, error, update, submit, reset };
}
