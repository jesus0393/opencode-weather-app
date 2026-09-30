import { createInterface } from "node:readline";
import type { Prompter } from "../types/Prompter.ts";
import { printWarn } from "./output.ts";

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
