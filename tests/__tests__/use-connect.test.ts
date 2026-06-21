import { describe, it, expect } from "vitest";
import { parseConnectionString } from "@/lib/hooks/use-connect";

describe("parseConnectionString", () => {
  it("parses a full postgresql:// URL", () => {
    const result = parseConnectionString(
      "postgresql://admin:secret@my-db.cluster-xxx.us-east-1.rds.amazonaws.com:5432/mydb",
    );
    expect(result).toEqual({
      username: "admin",
      password: "secret",
      host: "my-db.cluster-xxx.us-east-1.rds.amazonaws.com",
      port: "5432",
      database: "mydb",
    });
  });

  it("parses postgres:// shorthand scheme", () => {
    const result = parseConnectionString(
      "postgres://user:pass@localhost:5432/myapp",
    );
    expect(result).toEqual({
      username: "user",
      password: "pass",
      host: "localhost",
      port: "5432",
      database: "myapp",
    });
  });

  it("defaults port to 5432 when omitted", () => {
    const result = parseConnectionString(
      "postgresql://user:pass@myhost.com/mydb",
    );
    expect(result).toEqual({
      username: "user",
      password: "pass",
      host: "myhost.com",
      port: "5432",
      database: "mydb",
    });
  });

  it("decodes URL-encoded characters", () => {
    const result = parseConnectionString(
      "postgresql://user%40corp:pass%21word@host:5432/my%5Fdb",
    );
    expect(result).toEqual({
      username: "user@corp",
      password: "pass!word",
      host: "host",
      port: "5432",
      database: "my_db",
    });
  });

  it("handles complex RDS-style endpoints", () => {
    const result = parseConnectionString(
      "postgresql://schemalens_admin:WgZ2QNuWx9z6uNRldjTP@schemalens-aurora.cluster-c0382qemwjnq.us-east-1.rds.amazonaws.com:5432/schemalens",
    );
    expect(result).toEqual({
      username: "schemalens_admin",
      password: "WgZ2QNuWx9z6uNRldjTP",
      host: "schemalens-aurora.cluster-c0382qemwjnq.us-east-1.rds.amazonaws.com",
      port: "5432",
      database: "schemalens",
    });
  });

  it("handles passwords with special characters", () => {
    const result = parseConnectionString(
      "postgresql://user:p%40ss%2Fword@host:5432/db",
    );
    expect(result).toEqual({
      username: "user",
      password: "p@ss/word",
      host: "host",
      port: "5432",
      database: "db",
    });
  });

  it("returns null for non-postgres URLs", () => {
    expect(parseConnectionString("mysql://user:pass@host/db")).toBeNull();
    expect(parseConnectionString("https://example.com")).toBeNull();
    expect(parseConnectionString("")).toBeNull();
  });

  it("returns null for malformed connection strings", () => {
    expect(parseConnectionString("not-a-url")).toBeNull();
    expect(parseConnectionString("postgresql://")).toBeNull();
    expect(parseConnectionString("postgresql://user@host/db")).toBeNull(); // no password
  });

  it("strips query parameters from database name", () => {
    const result = parseConnectionString(
      "postgresql://user:pass@host:5432/db?sslmode=require",
    );
    expect(result).toEqual({
      username: "user",
      password: "pass",
      host: "host",
      port: "5432",
      database: "db",
    });
  });

  it("handles database names with hyphens and dots", () => {
    const result = parseConnectionString(
      "postgresql://user:pass@host:5432/my-prod.v2",
    );
    expect(result).toEqual({
      username: "user",
      password: "pass",
      host: "host",
      port: "5432",
      database: "my-prod.v2",
    });
  });
});
