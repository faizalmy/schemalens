import { useState } from "react";
import { useRouter } from "next/navigation";

interface AuthFields {
  name: string;
  email: string;
  password: string;
}

export function useAuth(mode: "sign-in" | "sign-up") {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<AuthFields>({
    name: "",
    email: "",
    password: "",
  });

  function update(key: keyof AuthFields, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      const url =
        mode === "sign-in"
          ? "/api/auth/sign-in/email"
          : "/api/auth/sign-up/email";

      const body: Record<string, string> = {
        email: fields.email,
        password: fields.password,
      };
      if (mode === "sign-up") {
        body.name = fields.name;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || data.error || "Authentication failed");
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return { fields, loading, error, update, submit };
}
