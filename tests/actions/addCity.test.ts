import { describe, expect, test } from "bun:test";
import { searchAndAddCity } from "../../src/actions/addCity.ts";
import { captureConsole, expectSilent } from "../setup.ts";
import { plainColors, stripAnsi } from "../helpers/colors.ts";
import { config, geocodingResult, scriptedPrompter, type GeocodingResult } from "../helpers/factories.ts";
import { jsonResponse, stubFetch } from "../helpers/fetchStub.ts";

// La opción 3 es la única que llama al geocoding, así que aquí se stubea el fetch: una
// prueba de acción que dependiera de OpenMeteo sería intermitente.

const zihuatanejo = geocodingResult({
  id: 1234,
  name: "Zihuatanejo",
  admin1: "Guerrero",
  country: "México",
  latitude: 17.64,
  longitude: -101.39,
});
const springfield = geocodingResult({
  id: 111,
  name: "Springfield",
  admin1: "Illinois",
  country: "Estados Unidos",
  latitude: 39.8,
  longitude: -89.64,
});
const springfieldMo = geocodingResult({
  id: 222,
  name: "Springfield",
  admin1: "Missouri",
  country: "Estados Unidos",
  latitude: 37.2,
  longitude: -93.29,
});

// El nombre que se ve en los selectores y confirmaciones, ya mapeado a City.
const SPRINGFIELD_LABEL = "Springfield, Illinois, Estados Unidos";

function geocoding(...results: GeocodingResult[]): void {
  stubFetch(jsonResponse({ results }));
}

describe("searchAndAddCity", () => {
  test("con una sola coincidencia no pregunta nada", async () => {
    plainColors();
    geocoding(zihuatanejo);
    const prompter = scriptedPrompter("zihuatanejo");

    const outcome = await searchAndAddCity({ config: config(), ask: prompter.ask });

    expect(prompter.asked).toEqual(["  Nombre de la ciudad: "]);
    expect(outcome?.changed).toBe("cities");
    expect(outcome?.config.cities).toEqual([
      {
        id: 1234,
        name: "Zihuatanejo",
        region: "Guerrero",
        country: "México",
        latitude: 17.64,
        longitude: -101.39,
      },
    ]);
    // Sin default previo, la primera ciudad agregada lo announce.
    expect(stripAnsi(outcome?.message[0] ?? "")).toBe(
      "Zihuatanejo, Guerrero, México agregada como ciudad default.",
    );
  });

  test("con un default ya establecido no lo anuncia", async () => {
    plainColors();
    geocoding(zihuatanejo);
    const { ask } = scriptedPrompter("zihuatanejo");

    const outcome = await searchAndAddCity({
      config: config({ cities: [geocodingToCity(999)], defaultCityId: 999 }),
      ask,
    });

    expect(stripAnsi(outcome?.message[0] ?? "")).toBe("Zihuatanejo, Guerrero, México agregada.");
  });

  test("con varias coincidencias pregunta cuál es", async () => {
    geocoding(springfield, springfieldMo);
    const prompter = scriptedPrompter("springfield", "2");

    const outcome = await searchAndAddCity({ config: config(), ask: prompter.ask });

    expect(prompter.asked).toHaveLength(2);
    expect(outcome?.config.cities.map((saved) => saved.id)).toEqual([222]);
  });

  test("las ciudades ya guardadas no se ofrecen", async () => {
    geocoding(springfield, springfieldMo);
    const prompter = scriptedPrompter("springfield", "1");

    const outcome = await searchAndAddCity({
      config: config({ cities: [geocodingToCity(111)], defaultCityId: 111 }),
      ask: prompter.ask,
    });

    // Queda una sola disponible, así que no hay nada que elegir.
    expect(prompter.asked).toHaveLength(1);
    expect(outcome?.config.cities.map((saved) => saved.id)).toEqual([111, 222]);
  });

  test("si todas las coincidencias ya están guardadas avisa y no cambia nada", async () => {
    const console = captureConsole();
    geocoding(springfield);
    const { ask } = scriptedPrompter("springfield");

    const outcome = await searchAndAddCity({
      config: config({ cities: [geocodingToCity(111)], defaultCityId: 111 }),
      ask,
    });

    expect(outcome).toBeNull();
    expect(console.text()).toContain(`${SPRINGFIELD_LABEL} ya está en la lista.`);
  });

  test("sin coincidencias avisa y no guarda", async () => {
    const console = captureConsole();
    geocoding();
    const { ask } = scriptedPrompter("xyzxyz");

    expect(await searchAndAddCity({ config: config(), ask })).toBeNull();
    expect(console.text()).toContain('No se encontró ninguna ciudad para "xyzxyz".');
  });

  test("un nombre vacío no llega al geocoding", async () => {
    const console = captureConsole();
    const stub = stubFetch(jsonResponse({}));
    const { ask } = scriptedPrompter("");

    expect(await searchAndAddCity({ config: config(), ask })).toBeNull();
    expect(console.text()).toContain("El nombre de la ciudad no puede estar vacío.");
    expect(stub.urls).toEqual([]);
  });

  test("stdin cerrado antes del nombre no guarda nada", async () => {
    const stub = stubFetch(jsonResponse({}));
    const { ask } = scriptedPrompter(); // sin respuestas: el prompter devuelve null

    expect(await searchAndAddCity({ config: config(), ask })).toBeNull();
    expect(stub.urls).toEqual([]);
  });

  test("cancelar el selector no guarda nada", async () => {
    captureConsole();
    geocoding(springfield, springfieldMo);
    const { ask } = scriptedPrompter("springfield", "9"); // fuera de rango

    expect(await searchAndAddCity({ config: config(), ask })).toBeNull();
  });

  test("el fallo del geocoding sube como error, no como confirmación", async () => {
    const console = captureConsole();
    stubFetch(jsonResponse({}, 500));
    const { ask } = scriptedPrompter("springfield");

    await expect(searchAndAddCity({ config: config(), ask })).rejects.toThrow("OpenMeteo respondió 500");
    expectSilent(console);
  });
});

// Las ciudades del config ya vienen mapeadas, así que se derivan de la misma fixture.
function geocodingToCity(id: number) {
  return {
    id,
    name: "Springfield",
    region: id === 111 ? "Illinois" : "Missouri",
    country: "Estados Unidos",
    latitude: 39.8,
    longitude: -89.64,
  };
}