// Códigos ANSI para dar color a la salida. Se usan escapes directos en vez de una
// dependencia: el proyecto no tiene dependencias runtime y compila a binario.
const ESC = "\u001B[";
const RESET = `${ESC}0m`;

const CODES = {
  bold: 1,
  dim: 2,
  red: 31,
  green: 32,
  yellow: 33,
  cyan: 36,
} as const;

export type ColorName = keyof typeof CODES;

export type Paint = (text: string) => string;

// Sin terminal (pipe a un archivo, otro script) los escapes ensucian la salida,
// así que se desactivan. NO_COLOR es el estándar https://no-color.org y FORCE_COLOR
// permite forzarlos al redirigir.
function isEnabled(): boolean {
  if (process.env["NO_COLOR"] !== undefined) return false;
  if (process.env["FORCE_COLOR"] !== undefined) return true;
  return process.stdout.isTTY === true;
}

function paint(code: number): Paint {
  return (text) => (isEnabled() ? `${ESC}${code}m${text}${RESET}` : text);
}

export const colors: Record<ColorName, Paint> = {
  bold: paint(CODES.bold),
  dim: paint(CODES.dim),
  red: paint(CODES.red),
  green: paint(CODES.green),
  yellow: paint(CODES.yellow),
  cyan: paint(CODES.cyan),
};
