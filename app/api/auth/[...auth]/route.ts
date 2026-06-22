import { auth } from "@/lib/auth";

export const GET = async (request: Request) => {
  const resp = await auth.handler(request);
  const body = await resp.clone().text();
  const headers = Object.fromEntries(resp.headers.entries());
  return Response.json({
    status: resp.status,
    body: body.slice(0, 500),
    headers,
  });
};

export const POST = async (request: Request) => {
  // Monkey-patch console.error to capture better-auth's #SERVER_ERROR
  const origError = console.error;
  const captured: string[] = [];
  console.error = (...args: any[]) => {
    captured.push(
      args
        .map((a) => {
          if (a instanceof Error) {
            return `[${a.name}] msg=${a.message} stack_first=${(a.stack||"").split("\n").slice(0,2).join(" | ")}`;
          }
          return String(a);
        })
        .join(" ")
    );
    origError(...args);
  };

  const resp = await auth.handler(request);
  const body = await resp.clone().text();
  const headers = Object.fromEntries(resp.headers.entries());

  console.error = origError;

  return Response.json({
    status: resp.status,
    body: body.slice(0, 500),
    headers,
    serverError: captured.join("\n---\n").slice(0, 2000),
  });
};
