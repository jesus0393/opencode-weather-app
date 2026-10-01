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
  // La última SERVIDA, no la última encolada: es lo que se repite al agotarse la cola.
  let lastServed: Response | undefined;

  const handler = async (input: string | URL | Request): Promise<Response> => {
    urls.push(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);

    const next = queue.shift();
    if (next) {
      lastServed = typeof next === "function" ? next() : next;
    } else if (!lastServed) {
      throw new Error("stubFetch: no hay respuestas encoladas");
    }

    // clone() y no la respuesta tal cual: un body de Response se lee una sola vez, así
    // que repetir el mismo objeto hacía fallar la segunda petición con "Body already
    // used". Clonar da un body nuevo por llamada y preserva status y headers.
    //
    // El cast es por los tipos de bun: `clone()` está declarado con el Response de
    // undici y no con el global. El mismo `as unknown as typeof fetch` de abajo ya
    // depende de que ambos sean el mismo objeto en runtime.
    return lastServed.clone() as unknown as Response;
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