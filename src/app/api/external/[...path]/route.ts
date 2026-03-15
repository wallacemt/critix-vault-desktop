import { errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const DEFAULT_EXTERNAL_API = "http://127.0.0.1:8080";
const ALLOWED_PREFIXES = ["/status", "/media/"];

const getExternalApiBase = () => {
  const raw = process.env.CRITIX_EXTERNAL_API_URL || process.env.NEXT_PUBLIC_CRITIX_API_URL || DEFAULT_EXTERNAL_API;
  return raw.replace(/\/+$/, "");
};

const isAllowedPath = (path: string) => {
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix));
};

const methodAllowsBody = (method: string) => {
  return !["GET", "HEAD"].includes(method.toUpperCase());
};

const forward = async (request: NextRequest, pathSegments: string[]) => {
  const incomingPath = `/${pathSegments.join("/")}`;

  if (!isAllowedPath(incomingPath)) {
    return errorResponse(403, "BAD_REQUEST", "External API path is not allowed", { incomingPath });
  }

  const requestUrl = new URL(request.url);
  const target = new URL(`${getExternalApiBase()}${incomingPath}`);
  target.search = requestUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (methodAllowsBody(request.method)) {
    init.body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(target, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    logger.error("Failed to proxy external API request", error, {
      incomingPath,
      target: target.toString(),
      method: request.method,
    });
    return errorResponse(502, "EXTERNAL_API_ERROR", "Failed to connect to external API", {
      target: target.toString(),
    });
  }
};

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return forward(request, path ?? []);
}
