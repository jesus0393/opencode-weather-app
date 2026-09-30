// Traduce un error desconocido a texto mostrable. Vive en utils y no junto a los
// printers porque el storage también necesita convertir fallos de disco a texto.
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "error desconocido";
}
