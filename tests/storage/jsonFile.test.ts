import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { exists, readJson, writeJson } from "../../src/storage/jsonFile.ts";

// Estas rutas son explícitas, no las constantes de los storages: jsonFile recibe el
// path como parámetro, así que el disco real no entra nunca en el test.

const dirs: string[] = [];

async function tempFile(name: string, content?: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "weather-json-"));
  dirs.push(dir);
  const path = join(dir, name);
  if (content !== undefined) await writeFile(path, content, "utf8");
  return path;
}

afterEach(async () => {
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir !== undefined) await rm(dir, { recursive: true, force: true });
  }
});

describe("readJson", () => {
  test("devuelve el contenido parseado", async () => {
    expect(await readJson(await tempFile("a.json", '{"unit":"fahrenheit"}'))).toEqual({ unit: "fahrenheit" });
  });

  test("un archivo inexistente no lanza", async () => {
    expect(await readJson(await tempFile("nope.json"))).toBeUndefined();
  });

  test("un JSON roto no lanza y devuelve undefined", async () => {
    expect(await readJson(await tempFile("bad.json", "{ esto no es json"))).toBeUndefined();
  });
});

describe("writeJson", () => {
  test("crea el directorio que falta", async () => {
    const dir = await mkdtemp(join(tmpdir(), "weather-json-"));
    dirs.push(dir);
    const path = join(dir, "anidado", "a.json");

    expect(await writeJson(path, { unit: "celsius" })).toEqual({ ok: true });
    expect(await readJson(path)).toEqual({ unit: "celsius" });
  });

  test("escribe JSON con salto de línea final", async () => {
    const path = await tempFile("a.json");
    await writeJson(path, { unit: "celsius" });

    expect(await readFile(path, "utf8")).toBe('{\n  "unit": "celsius"\n}\n');
  });

  test("sobrescribe el contenido anterior", async () => {
    const path = await tempFile("a.json", '{"unit":"fahrenheit"}');
    await writeJson(path, { unit: "celsius" });

    expect(await readJson(path)).toEqual({ unit: "celsius" });
  });

  test("una ruta read-only devuelve el motivo y no lanza", async () => {
    const path = await tempFile("a.json", "{}");
    await chmod(path, 0o444);
    try {
      const result = await writeJson(path, { unit: "celsius" });

      expect(result.ok).toBe(false);
      // El motivo es lo que el loop muestra al usuario, así que no puede venir vacío.
      expect(result.ok === false && result.reason.length).toBeGreaterThan(0);
      // El archivo quedó como estaba.
      expect(await readJson(path)).toEqual({});
    } finally {
      await chmod(path, 0o600);
    }
  });
});

describe("exists", () => {
  test("distingue un archivo de uno que no está", async () => {
    expect(await exists(await tempFile("a.json", "{}"))).toBe(true);
    expect(await exists(await tempFile("nope.json"))).toBe(false);
  });
});