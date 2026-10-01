import { describe, expect, test } from "bun:test";
import { parseCities } from "../../src/storage/citiesStorage.ts";
import { parseUnit } from "../../src/storage/settingsStorage.ts";
import { city } from "../helpers/factories.ts";

const ottawa = city({ id: 123, name: "Ottawa" });
const zurich = city({ id: 456, name: "Zurich" });

// El archivo es editable a mano: cada test representa un config.json escrito a pulso.
// Los casos se generan con un bucle en vez de test.each porque `undefined` como fila
// deja el test colgado en Bun.
function testRaw(label: string, cases: unknown[], assert: (raw: unknown) => void): void {
  for (const raw of cases) {
    test(`${label} ante ${JSON.stringify(raw) ?? "undefined"}`, () => assert(raw));
  }
}

describe("parseCities", () => {
  test("lee un archivo válido", () => {
    expect(parseCities({ cities: [ottawa, zurich], defaultCityId: 456 })).toEqual({
      cities: [ottawa, zurich],
      defaultCityId: 456,
    });
  });

  testRaw("cae al vacío", [undefined, null, 42, "texto", []], (raw) => {
    expect(parseCities(raw)).toEqual({ cities: [], defaultCityId: null });
  });

  test("descarta las ciudades con campos inválidos", () => {
    const raw = {
      cities: [ottawa, { id: "456", name: "Zurich", latitude: 1, longitude: 2 }, { name: "Sin id" }],
      defaultCityId: 123,
    };

    expect(parseCities(raw).cities).toEqual([ottawa]);
  });

  test("cities ausente o no-array deja la lista vacía", () => {
    expect(parseCities({ defaultCityId: 123 }).cities).toEqual([]);
    expect(parseCities({ cities: "Ottawa" }).cities).toEqual([]);
  });

  test("un defaultCityId que no apunta a nada se re-resuelve", () => {
    expect(parseCities({ cities: [ottawa, zurich], defaultCityId: 999 }).defaultCityId).toBe(123);
  });

  test("un defaultCityId no numérico cae a la primera ciudad", () => {
    expect(parseCities({ cities: [ottawa, zurich], defaultCityId: "456" }).defaultCityId).toBe(123);
  });

  test("las ciudades sin región ni país se aceptan", () => {
    const bare = city({ region: null, country: null });
    expect(parseCities({ cities: [bare], defaultCityId: null }).cities).toEqual([bare]);
  });

  // Los opcionales ausentes se normalizan a null. Sin esto quedaban `undefined`, que
  // formatCityLabel no filtraba y terminaba en una etiqueta con huecos: "Ottawa, , ".
  test("los opcionales ausentes se normalizan a null", () => {
    const parsed = parseCities({ cities: [{ id: 1, name: "Ottawa", latitude: 45.4, longitude: -75.7 }] });
    expect(parsed.cities[0]).toEqual({ id: 1, name: "Ottawa", region: null, country: null, latitude: 45.4, longitude: -75.7 });
  });

  // El archivo es editable a pulso: un campo con el tipo equivocado descarta la
  // ciudad en vez de propagarse como si fuera un string.
  test("una región o un país del tipo equivocado descarta la ciudad", () => {
    const bad: unknown[] = [
      { id: 1, name: "Ottawa", region: 42, latitude: 45.4, longitude: -75.7 },
      { id: 1, name: "Ottawa", country: true, latitude: 45.4, longitude: -75.7 },
      { id: 1, name: "Ottawa", region: ["Ontario"], latitude: 45.4, longitude: -75.7 },
    ];
    for (const entry of bad) {
      expect(parseCities({ cities: [entry], defaultCityId: 1 }).cities).toEqual([]);
    }
  });

  test("los campos extra del archivo se ignoran", () => {
    expect(parseCities({ cities: [ottawa], defaultCityId: 123, unit: "fahrenheit" })).toEqual({
      cities: [ottawa],
      defaultCityId: 123,
    });
  });
});

describe("parseUnit", () => {
  for (const unit of ["celsius", "fahrenheit"] as const) {
    test(`acepta ${unit}`, () => expect(parseUnit({ unit })).toBe(unit));
  }

  testRaw("cae a celsius", [undefined, null, {}, { unit: "kelvin" }, { unit: 3 }, "fahrenheit"], (raw) => {
    expect(parseUnit(raw)).toBe("celsius");
  });
});