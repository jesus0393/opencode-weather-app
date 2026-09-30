// Indicador de carga para las llamadas de red. Vive en la capa de presentación y no
// en fetchJson a propósito: showAllWeather lanza N peticiones en paralelo y un
// spinner por petición se pelearía por la misma línea, además de que api/ no debe
// importar de presentation/.
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const FRAME_INTERVAL_MS = 80;
// Por debajo de este tiempo la respuesta llega antes de que el ojo la note:
// dibujar de inmediato produce parpadeo en el caso rápido.
const FIRST_FRAME_DELAY_MS = 200;

// Solo se anima con terminal: al redirigir o pipear, un \r cada 80 ms ensuciaría la
// salida y los escapes de tiempo. Misma regla que los colores.
function isAnimated(): boolean {
  return process.stdout.isTTY === true;
}

// Los segundos son la parte útil: en el camino lento (timeout de 10 s) el gif solo
// no dice si sigue trabajando o se colgó.
export async function withLoading<T>(label: string, task: () => Promise<T>): Promise<T> {
  if (!isAnimated()) return task();

  const startedAt = Date.now();
  let ticker: ReturnType<typeof setInterval> | undefined;
  let frameIndex = 0;
  let width = 0;

  const draw = (): void => {
    const symbol = FRAMES[frameIndex % FRAMES.length] ?? "";
    const line = `  ${symbol} ${label} ${Math.round((Date.now() - startedAt) / 1000)}s`;
    process.stdout.write(`\r${line}`);
    frameIndex += 1;
    width = line.length;
  };

  const begin = setTimeout(() => {
    draw();
    ticker = setInterval(draw, FRAME_INTERVAL_MS);
  }, FIRST_FRAME_DELAY_MS);

  try {
    return await task();
  } finally {
    clearTimeout(begin);
    if (ticker !== undefined) {
      clearInterval(ticker);
      process.stdout.write(`\r${" ".repeat(width)}\r`);
    }
  }
}
