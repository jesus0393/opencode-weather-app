import { colors } from "../utils/colors.ts";

const SEPARATOR = "═".repeat(40);
const TITLE = "WEATHER CLI";
const TITLE_INDENT = " ".repeat(Math.floor((SEPARATOR.length - TITLE.length) / 2));

export function printSeparator(): void {
  console.log(colors.dim(SEPARATOR));
}

export function printBanner(): void {
  printSeparator();
  console.log(colors.cyan(colors.bold(`${TITLE_INDENT}${TITLE}`)));
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
