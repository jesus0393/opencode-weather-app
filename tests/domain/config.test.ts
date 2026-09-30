import { describe, expect, test } from "bun:test";
import {
  addCity,
  defaultCity,
  findCity,
  hasCity,
  removeCity,
  resolveDefaultCityId,
  setDefaultCity,
  toggleUnit,
} from "../../src/domain/config.ts";
import { city, config } from "../helpers/factories.ts";

const ottawa = city({ id: 123, name: "Ottawa" });
const zurich = city({ id: 456, name: "Zurich" });

describe("resolveDefaultCityId", () => {
  test("respeta el id preferido si sigue en la lista", () => {
    expect(resolveDefaultCityId([ottawa, zurich], 456)).toBe(456);
  });

  test("cae a la primera ciudad si el preferido ya no existe", () => {
    expect(resolveDefaultCityId([ottawa, zurich], 999)).toBe(123);
  });

  test("sin lista no hay default", () => {
    expect(resolveDefaultCityId([], 123)).toBeNull();
  });

  test("una lista vacía de preferencias no propaga null como id", () => {
    expect(resolveDefaultCityId([zurich], null)).toBe(456);
  });
});

describe("findCity", () => {
  test("null busca null", () => {
    expect(findCity(config({ cities: [ottawa] }), null)).toBeNull();
  });

  test("un id desconocido no encuentra nada", () => {
    expect(findCity(config({ cities: [ottawa] }), 999)).toBeNull();
  });

  test("defaultCity delega en findCity", () => {
    const current = config({ cities: [ottawa, zurich], defaultCityId: 456 });
    expect(defaultCity(current)).toEqual(zurich);
  });
});

describe("addCity", () => {
  test("la primera ciudad agregada se vuelve default", () => {
    const updated = addCity(config(), ottawa);
    expect(updated.cities).toEqual([ottawa]);
    expect(updated.defaultCityId).toBe(123);
  });

  test("no pisa un default ya establecido", () => {
    const current = config({ cities: [ottawa], defaultCityId: 123 });
    expect(addCity(current, zurich).defaultCityId).toBe(123);
  });

  test("ignora una ciudad ya guardada, por id y no por posición", () => {
    const current = config({ cities: [ottawa], defaultCityId: 123 });
    const sameIdElsewhere = city({ id: 123, name: "Otro Ottawa" });
    expect(addCity(current, sameIdElsewhere)).toBe(current);
  });
});

describe("removeCity", () => {
  test("elimina por id y re-resuelve el default si era la borrada", () => {
    const current = config({ cities: [ottawa, zurich], defaultCityId: 123 });
    const updated = removeCity(current, 123);

    expect(updated.cities).toEqual([zurich]);
    expect(updated.defaultCityId).toBe(456);
  });

  test("deja el default intacto si se borra otra", () => {
    const current = config({ cities: [ottawa, zurich], defaultCityId: 456 });
    expect(removeCity(current, 123).defaultCityId).toBe(456);
  });

  test("un id inexistente no cambia nada", () => {
    const current = config({ cities: [ottawa], defaultCityId: 123 });
    expect(removeCity(current, 999)).toBe(current);
  });

  test("borrar la última deja la lista y el default vacíos", () => {
    const current = config({ cities: [ottawa], defaultCityId: 123 });
    expect(removeCity(current, 123)).toEqual(config());
  });
});

describe("setDefaultCity", () => {
  test("promueve una ciudad de la lista", () => {
    const current = config({ cities: [ottawa, zurich], defaultCityId: 123 });
    expect(setDefaultCity(current, 456).defaultCityId).toBe(456);
  });

  test("una ciudad que no está no se vuelve default", () => {
    const current = config({ cities: [ottawa], defaultCityId: 123 });
    expect(setDefaultCity(current, 999)).toBe(current);
  });
});

describe("toggleUnit", () => {
  test("alterna celsius y fahrenheit", () => {
    expect(toggleUnit(config({ unit: "celsius" })).unit).toBe("fahrenheit");
    expect(toggleUnit(config({ unit: "fahrenheit" })).unit).toBe("celsius");
  });

  test("no toca las ciudades", () => {
    const current = config({ cities: [ottawa], defaultCityId: 123 });
    expect(toggleUnit(current).cities).toEqual([ottawa]);
  });
});

describe("hasCity", () => {
  test("reconoce la ciudad guardada", () => {
    expect(hasCity(config({ cities: [ottawa] }), 123)).toBe(true);
    expect(hasCity(config({ cities: [ottawa] }), 456)).toBe(false);
  });
});