import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

/** Resolve a URL base do backend em tempo de execução. */
function getBackendOrigin(): string {
  const raw = (process.env.API_INTERNO ?? "http://127.0.0.1:8000")
    .trim()
    .replace(/\/+$/, "");
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `http://${raw}`;
}

async function proxy(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } },
): Promise<Response> {
  const { path } = await Promise.resolve(context.params);
  const targetUrl = `${getBackendOrigin()}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao conectar ao backend";
    return Response.json(
      { detail: `Proxy indisponível (${targetUrl}): ${message}` },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    // Node fetch já descomprime a resposta; manter content-encoding quebraria o navegador.
    if (!HOP_BY_HOP.has(lower) && lower !== "content-encoding") {
      responseHeaders.set(key, value);
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
export const HEAD = proxy;
