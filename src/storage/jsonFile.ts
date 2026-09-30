import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { SaveResult } from "../types/Storage.ts";
import { describeError } from "../utils/errors.ts";

// Plumero de I/O de los archivos de storage. Aislado para que cada storage describa
// su formato y su parseo sin repetir el mkdir ni el manejo de errores de escritura.

// undefined = el archivo no existe o no se pudo parsear. Lo que haga el llamador
// con eso (volver al vacío, no migrar) es política suya, no de este archivo.
export async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return undefined;
  }
}

// Igual que readJson, un fallo al guardar no tumba la app: se devuelve el motivo
// para que el loop lo muestre y decida no confirmar el cambio.
export async function writeJson(path: string, value: unknown): Promise<SaveResult> {
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: describeError(error) };
  }
}

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
