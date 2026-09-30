import { describe, expect, test } from "bun:test";
import { fetchJson } from "../../src/api/http.ts";
import { jsonResponse, stubFetch, timeoutResponse } from "../helpers/fetchStub.ts";

describe("fetchJson", () => {
  test("devuelve el cuerpo parseado", async () => {
    stubFetch(jsonResponse({ results: [] }));
    expect(await fetchJson<{ results: unknown[] }>("https://api.test/v1")).toEqual({ results: [] });
  });

  test("un status no exitoso lanza con el código", async () => {
    stubFetch(jsonResponse({}, 503));
    await expect(fetchJson("https://api.test/v1")).rejects.toThrow("OpenMeteo respondió 503");
  });

  test("un timeout se traduce a un mensaje entendible", async () => {
    // http.ts traduce por el nombre del error, que es lo que lanza AbortSignal.timeout.
    stubFetch(timeoutResponse);

    const error = await fetchJson("https://api.test/v1").catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("OpenMeteo no respondió a tiempo. Intenta de nuevo.");
  });

  test("un error de red cualquiera se propaga sin retrabajar", async () => {
    stubFetch(() => {
      throw new TypeError("fetch failed");
    });

    await expect(fetchJson("https://api.test/v1")).rejects.toThrow("fetch failed");
  });

  test("siempre pide por GET", async () => {
    const stub = stubFetch(jsonResponse({}));
    await fetchJson("https://api.test/v1");
    expect(stub.urls).toEqual(["https://api.test/v1"]);
  });
});