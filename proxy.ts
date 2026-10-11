import { NextResponse } from "next/server";
import { env } from "@/app/runtime/env";
import { previewAccessResponse, SECURITY_HEADERS } from "./app/runtime/web-security";

// Runs before public-file dispatch as well as application routes on VPS.
export async function proxy(request: Request) {
  const denied = await previewAccessResponse(request, env);
  const response = denied || NextResponse.next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  return response;
}
