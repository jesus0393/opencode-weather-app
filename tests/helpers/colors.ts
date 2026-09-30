// El ancho de columna de formatTable se mide sobre texto plano y el color se aplica
// después, así que el mismo test corre en ambos modos y compara. isEnabled() se
// evalúa en cada llamada de paint, por lo que cambiar el env en medio del test basta.
//
// El reset a texto plano lo hace tests/setup.ts en un afterEach global: cambiarlo
// aquí no bastaba porque Bun no garantiza que un afterEach de este módulo corra
// antes de que empiece el archivo de test siguiente.

const NO_COLOR = "NO_COLOR";
const FORCE_COLOR = "FORCE_COLOR";

export function forceColors(): void {
  delete process.env[NO_COLOR];
  process.env[FORCE_COLOR] = "1";
}

export function plainColors(): void {
  delete process.env[FORCE_COLOR];
  process.env[NO_COLOR] = "1";
}

// Quita los escapes ANSI para comparar lo que el usuario ve realmente.
export function stripAnsi(text: string): string {
  return text.replace(/\u001B\[[0-9;]*m/g, "");
}