import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

// El storage resuelve sus rutas con homedir() al importar el módulo, y Bun cachea
// homedir() al arrancar el proceso: cambiar process.env.HOME dentro del test no
// cambia nada. La única forma de darle un HOME de verdad es arrancar otro proceso.
//
// Eso es además lo que se quiere aquí: correr la app real de punta a punta, con un
// HOME desechable y sin abrir terminal, sin tocar el ~/.config del usuario.

const PROJECT_ROOT = join(import.meta.dir, "..", "..");
const ENTRY = join(PROJECT_ROOT, "src", "index.ts");

export interface AppRun {
  home: string;
  stdout: string;
  stderr: string;
}

const APP_TIMEOUT_MS = 20_000;

export function configDirOf(home: string): string {
  return join(home, ".config", "weather-cli");
}

export async function createHome(): Promise<string> {
  return mkdtemp(join(tmpdir(), "weather-cli-test-"));
}

// Cada línea es lo que el usuario respondería: "1" elige la opción 1, y así.
export async function runApp(input: string[], home: string): Promise<AppRun> {
  const proc = Bun.spawn(["bun", "run", ENTRY], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, HOME: home, NO_COLOR: "1" },
    stdin: Buffer.from(`${input.join("\n")}\n`, "utf8"),
    stdout: "pipe",
    stderr: "pipe",
  });

  // El watchdog evita que un test colgado cuelgue la suite: la app no debería
  // tardar más de esto, y si lo hace el fallo es de la app, no una espera eterna.
  const watchdog = setTimeout(() => proc.kill(), APP_TIMEOUT_MS);

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  clearTimeout(watchdog);

  return { home, stdout, stderr };
}

// Escribe un archivo de storage directamente, para simular lo que el usuario hizo a
// mano o una migración a medias.
export async function seedConfig(home: string, file: string, content: unknown): Promise<void> {
  const dir = configDirOf(home);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, file), `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

// readdir no garantiza orden: se ordena para que los asserts comparen contenido.
export async function listConfigDir(home: string): Promise<string[]> {
  return (await readdir(configDirOf(home)).catch(() => [])).sort();
}

export async function readConfigFile(home: string, file: string): Promise<unknown> {
  return JSON.parse(await readFile(join(configDirOf(home), file), "utf8"));
}