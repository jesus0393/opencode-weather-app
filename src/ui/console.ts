import { createInterface } from "node:readline";
import type { Config } from "../types.ts";
import { colors } from "./colors.ts";
import { formatUnit } from "./format.ts";

const SEPARATOR = "═".repeat(40);
const TITLE = "WEATHER CLI";
const TITLE_INDENT = " ".repeat(Math.floor((SEPARATOR.length - TITLE.length) / 2));

// null significa que stdin se cerró (Ctrl+D / Ctrl+C) y ya no hay nada que leer.
export type Prompter = (question: string) => Promise<string | null>;

export interface PrompterFactory {
  ask: Prompter;
  close: () => void;
}

// Gestionamos las líneas a mano en vez de usar reader.question(): con stdin como
// pipe todas las líneas llegan de golpe y el evento "close" se dispararía antes de
// que el usuario contestara, cerrando el menú de forma prematura.
export function createPrompter(): PrompterFactory {
  const reader = createInterface({ input: process.stdin, output: process.stdout });

  const buffered: string[] = [];
  const waiting: Array<(line: string | null) => void> = [];
  let stdinEnded = false;

  reader.on("line", (line) => {
    const resolve = waiting.shift();
    if (resolve) resolve(line.trim());
    else buffered.push(line.trim());
  });

  const drain = (): void => {
    stdinEnded = true;
    while (waiting.length > 0) waiting.shift()?.(null);
  };

  reader.once("close", drain);
  reader.on("SIGINT", () => reader.close());

  const ask: Prompter = (question) =>
    new Promise((resolve) => {
      process.stdout.write(question);

      const line = buffered.shift();
      if (line !== undefined) {
        resolve(line);
        return;
      }
      if (stdinEnded) {
        resolve(null);
        return;
      }
      waiting.push(resolve);
    });

  return { ask, close: () => reader.close() };
}

export function printSeparator(): void {
  console.log(colors.dim(SEPARATOR));
}

export function printBanner(): void {
  printSeparator();
  console.log(colors.cyan(colors.bold(`${TITLE_INDENT}${TITLE}`)));
  printSeparator();
}

function menuOption(option: string, label: string): string {
  return `  ${colors.cyan(`${option}.`)} ${label}`;
}

export function printMenu(config: Config): void {
  console.log(menuOption("1", "Clima de ciudad default"));
  console.log(menuOption("2", `Clima de todas las ciudades (${config.cities.length})`));
  console.log(menuOption("3", "Buscar y agregar ciudad"));
  console.log(menuOption("4", "Eliminar ciudad"));
  console.log(menuOption("5", "Establecer ciudad default"));
  console.log(menuOption("8", `Ajustes (${formatUnit(config.unit)})`));
  console.log(menuOption("9", "Salir"));
  printSeparator();
}

export function printError(message: string): void {
  console.error(`  ${colors.red(message)}`);
}

// Aviso recuperable: la acción no se completó, pero no es un fallo (p. ej. la
// ciudad ya estaba en la lista).
export function printWarn(message: string): void {
  console.log(`  ${colors.yellow(message)}`);
}

export function printSuccess(message: string): void {
  console.log(`  ${colors.green(message)}`);
}

// Valida que la respuesta sea un índice dentro del rango abierto. null = el
// usuario canceló o no hay nada válido que elegir.
export async function askIndex(ask: Prompter, question: string, total: number): Promise<number | null> {
  const answer = await ask(question);
  if (answer === null) return null;

  const parsed = Number.parseInt(answer, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > total) {
    printWarn(`Ingresa un número entre 1 y ${total}.`);
    return null;
  }
  return parsed - 1;
}
