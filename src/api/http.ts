// Acceso HTTP a OpenMeteo. El timeout vive aquí y no en las acciones: sin él, una
// conexión estancada dejaría el menú colgado de forma indefinida.
const REQUEST_TIMEOUT_MS = 10_000;

export async function fetchJson<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`OpenMeteo respondió ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("OpenMeteo no respondió a tiempo. Intenta de nuevo.");
    }
    throw error;
  }
}
