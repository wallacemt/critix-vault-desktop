import { errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_PREFIXES = ["/status", "/media/"];

const TIMEOUT_MS = 15_000;
// Only idempotent methods are retried; POST/PUT/PATCH bodies are already consumed.
const MAX_RETRIES = 2;

const getExternalApiBase = (): string => {
  const raw = process.env.CRITIX_EXTERNAL_API_URL?.trim() || process.env.NEXT_PUBLIC_CRITIX_API_URL?.trim();
  if (!raw) {
    logger.error("External API URL not configured. Set CRITIX_EXTERNAL_API_URL in your .env file.", null, {
      CRITIX_EXTERNAL_API_URL: process.env.CRITIX_EXTERNAL_API_URL ?? "(not set)",
      NEXT_PUBLIC_CRITIX_API_URL: process.env.NEXT_PUBLIC_CRITIX_API_URL ?? "(not set)",
    });
    throw new Error("External API URL is not configured. Set CRITIX_EXTERNAL_API_URL in your environment.");
  }

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

  let apiBase: string;
  try {
    apiBase = getExternalApiBase();
  } catch (err) {
    return errorResponse(
      503,
      "INTERNAL_ERROR",
      "External API URL is not configured. Set CRITIX_EXTERNAL_API_URL in your .env file.",
      {
        hint: "Set CRITIX_EXTERNAL_API_URL in your .env file",
      },
    );
  }

  const requestUrl = new URL(request.url);
  const target = new URL(`${apiBase}${incomingPath}`);
  target.search = requestUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  // Force encodings supported by Node.js/undici — prevents zstd responses
  // which Node.js cannot decompress, causing binary data to be parsed as JSON
  headers.set("accept-encoding", "gzip, deflate, br");

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (methodAllowsBody(request.method)) {
    init.body = await request.arrayBuffer();
  }

  const isIdempotent = !methodAllowsBody(request.method);
  const maxAttempts = isIdempotent ? MAX_RETRIES : 1;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) await new Promise((r) => setTimeout(r, 500 * (attempt - 1)));
    try {
      logger.info(`[external-proxy] ${request.method} ${target.toString()}`);
      const response = await fetch(target, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
      const responseHeaders = new Headers(response.headers);
      responseHeaders.delete("content-encoding");
      responseHeaders.delete("transfer-encoding");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      lastError = error;
      const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      if (isTimeout && attempt < maxAttempts) {
        logger.warn(`[external-proxy] Timeout on attempt ${attempt}/${maxAttempts}, retrying... (${target.toString()})`);
        continue;
      }
      break;
    }
  }

  const isTimeout =
    lastError instanceof Error && (lastError.name === "TimeoutError" || lastError.name === "AbortError");
  logger.error("Failed to proxy external API request", lastError, {
    incomingPath,
    target: target.toString(),
    method: request.method,
  });
  // 504 for our own timeout; 502 when upstream returned an error or refused connection.
  return errorResponse(
    isTimeout ? 504 : 502,
    isTimeout ? "GATEWAY_TIMEOUT" : "EXTERNAL_API_ERROR",
    isTimeout ? "External API timed out" : "Failed to connect to external API",
    { target: target.toString() },
  );
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
