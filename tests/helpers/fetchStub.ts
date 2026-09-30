import { afterEach, expect } from "bun:test";

// Stub de globalThis.fetch: las clases de api/ no reciben el cliente por parámetro,
// así que la única costura es el global. Se restaura siempre, también si el test
// falla a mitad.

const originalFetch = globalThis.fetch;
let restore: (() => void) | null = null;

interface Stub {
  urls: string[];
}

// Cada llamada encolada responde una vez; al agotarse se repite la última, para que
// un test que solo quiere "no importa el contenido" no tenga que contarla.
export function stubFetch(...responses: Array<Response | (() => Response)>): Stub {
  const queue = [...responses];
  const urls: string[] = [];
  let last = queue.pop();

  const handler = async (input: string | URL | Request): Promise<Response> => {
    urls.push(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    const next = queue.shift() ?? last;
    if (!next) throw new Error("stubFetch: no hay respuestas encoladas");
    last = next;
    return typeof next === "function" ? next() : next;
  };

  globalThis.fetch = handler as unknown as typeof fetch;
  restore = () => {
    globalThis.fetch = originalFetch;
  };

  return { urls };
}

afterEach(() => {
  restore?.();
  restore = null;
});

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// http.ts traduce por el `name` del error, así que el stub reproduce el que lanza
// AbortSignal.timeout al agotarse.
export function timeoutResponse(): Response {
  const error = new Error("The operation timed out.");
  error.name = "TimeoutError";
  throw error;
}

export function paramsOf(url: string): URLSearchParams {
  return new URL(url).searchParams;
}

// Verifica el método GET implícito: fetchJson solo debe hacer GET.
export function expectGet(url: string): void {
  expect(url.startsWith("https://")).toBe(true);
}