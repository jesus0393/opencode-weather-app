import { describe, expect, test } from "bun:test";
import { askIndex } from "../../src/presentation/input.ts";
import { captureConsole, expectSilent } from "../setup.ts";
import { scriptedPrompter } from "../helpers/factories.ts";

describe("askIndex", () => {
  test("devuelve el índice en base 0", async () => {
    const { ask } = scriptedPrompter("3");
    expect(await askIndex(ask, "Número: ", 5)).toBe(2);
  });

  test("acepta el último número del rango", async () => {
    const { ask } = scriptedPrompter("5");
    expect(await askIndex(ask, "Número: ", 5)).toBe(4);
  });

  test("fuera de rango avisa y no elige", async () => {
    const console = captureConsole();
    const { ask } = scriptedPrompter("6");

    expect(await askIndex(ask, "Número: ", 5)).toBeNull();
    expect(console.text()).toContain("Ingresa un número entre 1 y 5.");
  });

  test("cero y negativo también quedan fuera", async () => {
    captureConsole();
    const zero = scriptedPrompter("0");
    const negative = scriptedPrompter("-1");

    expect(await askIndex(zero.ask, "Número: ", 5)).toBeNull();
    expect(await askIndex(negative.ask, "Número: ", 5)).toBeNull();
  });

  test("lo que no es un número también avisa", async () => {
    const console = captureConsole();
    const { ask } = scriptedPrompter("morelia");

    expect(await askIndex(ask, "Número: ", 5)).toBeNull();
    expect(console.text()).toContain("Ingresa un número entre 1 y 5.");
  });

  test("stdin cerrado devuelve null sin pedir nada", async () => {
    const console = captureConsole();
    const { ask } = scriptedPrompter(); // sin respuestas: el prompter devuelve null

    expect(await askIndex(ask, "Número: ", 5)).toBeNull();
    expectSilent(console);
  });
});