import { describe, expect, test } from "bun:test";
import { adjustSettings } from "../../src/actions/adjustSettings.ts";
import { deleteCity } from "../../src/actions/removeCity.ts";
import { chooseDefaultCity } from "../../src/actions/setDefaultCity.ts";
import { captureConsole, expectSilent } from "../setup.ts";
import { plainColors, stripAnsi } from "../helpers/colors.ts";
import { city, config, scriptedPrompter } from "../helpers/factories.ts";

const ottawa = city({ id: 123, name: "Ottawa" });
const zurich = city({ id: 456, name: "Zurich", region: null, country: "Suiza" });

// Una acción no imprime su propia confirmación: devuelve el mensaje y quien confirma
// es el loop, ya guardado. Si una acción lo hiciera, el usuario vería "agregada" con
// el write fallado.

describe("adjustSettings", () => {
  test("alterna la unidad y toca solo la slice de settings", async () => {
    const console = captureConsole();

    const outcome = await adjustSettings({ config: config({ unit: "celsius" }), ask: async () => null });

    expect(outcome.changed).toBe("unit");
    expect(outcome.config.unit).toBe("fahrenheit");
    expect(outcome.message).toEqual(["Unidad de temperatura: °F."]);
    expectSilent(console);
  });

  test("vuelve a celsius desde fahrenheit", async () => {
    const outcome = await adjustSettings({ config: config({ unit: "fahrenheit" }), ask: async () => null });

    expect(outcome.config.unit).toBe("celsius");
  });

  test("no toca las ciudades", async () => {
    const outcome = await adjustSettings({
      config: config({ cities: [ottawa], defaultCityId: 123 }),
      ask: async () => null,
    });

    expect(outcome.config.cities).toEqual([ottawa]);
  });
});

describe("chooseDefaultCity", () => {
  test("promueve la ciudad elegida", async () => {
    plainColors();
    const { ask } = scriptedPrompter("2");

    const outcome = await chooseDefaultCity({
      config: config({ cities: [ottawa, zurich], defaultCityId: 123 }),
      ask,
    });

    expect(outcome?.changed).toBe("cities");
    expect(outcome?.config.defaultCityId).toBe(456);
    expect(stripAnsi(outcome?.message[0] ?? "")).toBe("Zurich, Suiza es ahora la ciudad default.");
  });

  test("elegir la que ya es default avisa y no guarda", async () => {
    const console = captureConsole();
    const { ask } = scriptedPrompter("1");

    const outcome = await chooseDefaultCity({
      config: config({ cities: [ottawa, zurich], defaultCityId: 123 }),
      ask,
    });

    expect(outcome).toBeNull();
    expect(console.text()).toContain("Ottawa, Ontario, Canadá ya es la ciudad default.");
  });

  test("cancelar no guarda nada", async () => {
    const { ask } = scriptedPrompter("9");

    expect(await chooseDefaultCity({ config: config({ cities: [ottawa] }), ask })).toBeNull();
  });

  test("sin ciudades avisa y no pregunta", async () => {
    const console = captureConsole();
    const prompter = scriptedPrompter();

    expect(await chooseDefaultCity({ config: config(), ask: prompter.ask })).toBeNull();
    expect(prompter.asked).toEqual([]);
    expect(console.text()).toContain("No hay ciudades guardadas");
  });
});

describe("deleteCity", () => {
  test("elimina la ciudad elegida", async () => {
    plainColors();
    const { ask } = scriptedPrompter("2");

    const outcome = await deleteCity({ config: config({ cities: [ottawa, zurich], defaultCityId: 123 }), ask });

    expect(outcome?.changed).toBe("cities");
    expect(outcome?.config.cities).toEqual([ottawa]);
    expect(stripAnsi(outcome?.message[0] ?? "")).toBe("Zurich, Suiza eliminada.");
  });

  test("al borrar la default se avisa de cuál quedó", async () => {
    const { ask } = scriptedPrompter("1");

    const outcome = await deleteCity({ config: config({ cities: [ottawa, zurich], defaultCityId: 123 }), ask });

    // El mensaje se calcula contra el config de ANTES de borrar; si se calculara
    // después, esta línea nunca aparecería.
    expect(stripAnsi(outcome?.message[1] ?? "")).toBe("Nueva ciudad default: Zurich, Suiza.");
  });

  test("al borrar la default se resuelve contra el config viejo", async () => {
    const { ask } = scriptedPrompter("1");

    const outcome = await deleteCity({ config: config({ cities: [ottawa, zurich], defaultCityId: 123 }), ask });

    expect(outcome?.config.defaultCityId).toBe(456);
  });

  test("borrar otra ciudad no menciona la default", async () => {
    const { ask } = scriptedPrompter("2");

    const outcome = await deleteCity({ config: config({ cities: [ottawa, zurich], defaultCityId: 123 }), ask });

    expect(outcome?.message).toHaveLength(1);
    expect(outcome?.config.defaultCityId).toBe(123);
  });

  test("stdin cerrado en el selector no guarda nada", async () => {
    const { ask } = scriptedPrompter();

    expect(await deleteCity({ config: config({ cities: [ottawa] }), ask })).toBeNull();
  });

  test("borrar la última avisa que no queda ninguna", async () => {
    const console = captureConsole();
    const { ask } = scriptedPrompter("1");

    const outcome = await deleteCity({ config: config({ cities: [ottawa], defaultCityId: 123 }), ask });

    expect(outcome?.config.defaultCityId).toBeNull();
    expect(console.text()).toContain("Ya no queda ninguna ciudad default.");
  });

  test("cancelar no guarda nada", async () => {
    const { ask } = scriptedPrompter("9");

    expect(await deleteCity({ config: config({ cities: [ottawa] }), ask })).toBeNull();
  });

  test("sin ciudades avisa y no pregunta", async () => {
    const console = captureConsole();
    const prompter = scriptedPrompter();

    expect(await deleteCity({ config: config(), ask: prompter.ask })).toBeNull();
    expect(prompter.asked).toEqual([]);
    expect(console.text()).toContain("No hay ciudades guardadas");
  });
});