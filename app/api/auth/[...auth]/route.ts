import { auth } from "@/lib/auth";

export const GET = async (request: Request) => {
  try {
    return await auth.handler(request);
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err?.message || String(err),
        name: err?.name || "unknown",
        code: err?.code || "none",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};

export const POST = async (request: Request) => {
  try {
    return await auth.handler(request);
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err?.message || String(err),
        name: err?.name || "unknown",
        code: err?.code || "none",
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
};
