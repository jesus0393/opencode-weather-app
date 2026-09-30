import { afterEach, beforeEach, expect, spyOn } from "bun:test";
import type { Mock } from "bun:test";

// Instrumentación global de la suite. Va en el preload (bunfig.toml) y no en un
// helper importado porque los hooks de un módulo importado no alcanzan a los tests
// declarados en otro archivo: los spies se instalarían, pero sin registrar llamadas.

let log: Mock<(...args: unknown[]) => void>;
let errors: Mock<(...args: unknown[]) => void>;

beforeEach(() => {
  // Los printers y `pickCity` escriben con console.log: sin silenciarlo, cada prueba
  // de acciones inundaría la salida del runner con la lista de ciudades. Los tests
  // leen de aquí lo que la app habría mostrado.
  log = spyOn(console, "log").mockImplementation(() => {});
  errors = spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  log.mockRestore();
  errors.mockRestore();

  // `bun test` en una terminal real deja stdout en TTY y encendería los colores, así
  // que los asserts sobre texto plano fallarían solo de forma interactiva. El reset va
  // en un afterEach global y no junto a forceColors porque Bun no garantiza que un
  // afterEach de módulo corra antes de que empiece el archivo siguiente.
  process.env["NO_COLOR"] = "1";
  delete process.env["FORCE_COLOR"];
});

function linesOf(spy: Mock<(...args: unknown[]) => void>): string[] {
  return spy.mock.calls.map((args) => args.map(String).join(" "));
}

export interface Captured {
  /** Todo lo que la app escribió, stdout y stderr juntos. */
  readonly lines: string[];
  text: () => string;
}

export function captureConsole(): Captured {
  // Es un getter y no un array ya construido: el texto se consulta después de que la
  // acción imprimió, y una instantánea tomada aquí estaría vacía.
  return {
    get lines() {
      return [...linesOf(log), ...linesOf(errors)];
    },
    text: () => [...linesOf(log), ...linesOf(errors)].join("\n"),
  };
}

// La forma en que se viola la invariante de "ninguna acción imprime su propia
// confirmación": un mensaje de éxito sin haber persistido.
export function expectSilent(captured: Captured): void {
  expect(captured.lines).toEqual([]);
}