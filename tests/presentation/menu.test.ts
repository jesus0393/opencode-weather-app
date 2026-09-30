import { describe, expect, test } from "bun:test";
import { EXIT_OPTION, MENU, printMenu } from "../../src/presentation/menu.ts";
import { captureConsole } from "../setup.ts";
import { city, config } from "../helpers/factories.ts";
import { stripAnsi } from "../helpers/colors.ts";

// El menú es la única fuente de verdad: una entrada olvidada no da error de
// compilación, solo una opción que nunca se ofrece o un "Opción inválida" en runtime.

describe("MENU", () => {
  test("las opciones van de 1 a 8 sin huecos ni repeticiones", () => {
    expect(MENU.map((entry) => entry.option)).toEqual(["1", "2", "3", "4", "5", "6", "7", "8"]);
  });

  test("salir es la 9 y no está en MENU", () => {
    expect(EXIT_OPTION).toBe("9");
    expect(MENU.some((entry) => entry.option === EXIT_OPTION)).toBe(false);
  });

  test("cada entrada tiene etiqueta y acción", () => {
    for (const entry of MENU) {
      expect(typeof entry.run).toBe("function");
      expect(entry.label(config()).length).toBeGreaterThan(0);
    }
  });

  test("las etiquetas que dependen del config lo leen de verdad", () => {
    const labelOf = (option: string, cities: number): string => {
      const entry = MENU.find((item) => item.option === option);
      const citiesWith = Array.from({ length: cities }, (_, index) => city({ id: index + 1 }));
      return entry?.label(config({ cities: citiesWith })) ?? "";
    };

    expect(labelOf("2", 0)).toBe("Clima de todas las ciudades (0)");
    expect(labelOf("2", 3)).toBe("Clima de todas las ciudades (3)");
    expect(labelOf("8", 0)).toBe("Ajustes (°C)");
    expect(labelOf("8", 0)).not.toBe("Ajustes (°F)");
  });
});

describe("printMenu", () => {
  test("imprime 1..8 y luego Salir, en ese orden", () => {
    const console = captureConsole();

    printMenu(config());

    const options = console.lines
      .map((line) => stripAnsi(line).trim())
      .filter((line) => /^\d+\./.test(line))
      .map((line) => line.split(".")[0] ?? "");

    expect(options).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    expect(console.text()).toContain("9. Salir");
  });
});