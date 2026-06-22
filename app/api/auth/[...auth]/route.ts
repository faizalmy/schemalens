import { auth } from "@/lib/auth";

export const GET = async (request: Request) => {
  return auth.handler(request);
};

export const POST = async (request: Request) => {
  return auth.handler(request);
};
