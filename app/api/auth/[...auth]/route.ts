import { auth } from "@/lib/auth";

export const GET = async (request: Request) => {
  const resp = await auth.handler(request);
  const body = await resp.clone().text();
  return Response.json({
    status: resp.status,
    body: body.slice(0, 500),
    headers: Object.fromEntries(resp.headers.entries()),
  });
};

export const POST = async (request: Request) => {
  const resp = await auth.handler(request);
  const body = await resp.clone().text();
  return Response.json({
    status: resp.status,
    body: body.slice(0, 500),
    headers: Object.fromEntries(resp.headers.entries()),
  });
};
