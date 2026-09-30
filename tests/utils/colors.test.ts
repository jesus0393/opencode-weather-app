import { describe, expect, test } from "bun:test";
import { colors } from "../../src/utils/colors.ts";
import { forceColors, plainColors } from "../helpers/colors.ts";

// El setup fija NO_COLOR, así que la suite es determinista aunque se corra en una
// terminal real. Aquí se comprueba que cada regla manda sobre la anterior.

describe("colors", () => {
  test("con NO_COLOR no escapa nada", () => {
    plainColors();
    expect(colors.red("error")).toBe("error");
    expect(colors.cyan("menú")).toBe("menú");
  });

  test("FORCE_COLOR escapa aunque NO_COLOR esté puesto", () => {
    // NO_COLOR manda sobre FORCE_COLOR: hay que quitarlo para probar el modo forzado.
    plainColors();
    expect(colors.red("error")).toBe("error");

    forceColors();
    expect(colors.red("error")).toBe("\u001B[31merror\u001B[0m");
  });

  test("el texto siempre vuelve al estado normal", () => {
    forceColors();

    expect(colors.yellow("21.5°C")).toBe("\u001B[33m21.5°C\u001B[0m");
  });
});