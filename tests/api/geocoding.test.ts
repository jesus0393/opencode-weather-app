import { describe, expect, test } from "bun:test";
import { searchCities } from "../../src/api/geocoding.ts";
import { jsonResponse, paramsOf, stubFetch } from "../helpers/fetchStub.ts";

describe("searchCities", () => {
  test("mapea la respuesta de OpenMeteo a City", async () => {
    stubFetch(
      jsonResponse({
        results: [
          {
            id: 3530597,
            name: "Ciudad de México",
            admin1: "Ciudad de México",
            country: "México",
            latitude: 19.42847,
            longitude: -99.12766,
          },
        ],
      }),
    );

    expect(await searchCities("ciudad de mexico")).toEqual([
      {
        id: 3530597,
        name: "Ciudad de México",
        region: "Ciudad de México",
        country: "México",
        latitude: 19.42847,
        longitude: -99.12766,
      },
    ]);
  });

  test("trae todas las coincidencias, no solo la primera", async () => {
    // Morelia sale 3 veces en México: desambiguar es trabajo de la UI.
    stubFetch(
      jsonResponse({
        results: [
          { id: 1, name: "Morelia", latitude: 19.7, longitude: -101.2 },
          { id: 2, name: "Morelia", latitude: 19.7, longitude: -101.2 },
          { id: 3, name: "Morelia", latitude: 19.7, longitude: -101.2 },
        ],
      }),
    );

    expect(await searchCities("morelia")).toHaveLength(3);
  });

  test("sin resultados devuelve una lista vacía", async () => {
    // La API omite el campo por completo cuando no hay coincidencias.
    stubFetch(jsonResponse({}));
    expect(await searchCities("xyzxyz")).toEqual([]);
  });

  test("results vacío también devuelve lista vacía", async () => {
    stubFetch(jsonResponse({ results: [] }));
    expect(await searchCities("xyzxyz")).toEqual([]);
  });

  test("admin1 y country ausentes quedan como null", async () => {
    stubFetch(jsonResponse({ results: [{ id: 1, name: "Marte", latitude: 0, longitude: 0 }] }));

    expect(await searchCities("marte")).toEqual([
      { id: 1, name: "Marte", region: null, country: null, latitude: 0, longitude: 0 },
    ]);
  });

  test("la URL lleva count, language=es y format", async () => {
    const stub = stubFetch(jsonResponse({}));
    await searchCities("springfield");

    const url = stub.urls[0] ?? "";
    expect(url.startsWith("https://geocoding-api.open-meteo.com/v1/search?")).toBe(true);

    const params = paramsOf(url);
    expect(params.get("name")).toBe("springfield");
    expect(params.get("count")).toBe("5");
    expect(params.get("language")).toBe("es");
    expect(params.get("format")).toBe("json");
  });

  test("un nombre con acentos viaja codificado en la URL", async () => {
    const stub = stubFetch(jsonResponse({}));
    await searchCities("Zúrich");

    expect(stub.urls[0]).not.toContain("Zúrich");
    expect(paramsOf(stub.urls[0] ?? "").get("name")).toBe("Zúrich");
  });
});