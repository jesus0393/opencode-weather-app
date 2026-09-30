import { afterAll, expect, test } from "bun:test";
import { chmod } from "node:fs/promises";
import { join } from "node:path";
import { citiesFile, city } from "../helpers/factories.ts";
import { configDirOf, createHome, listConfigDir, readConfigFile, runApp, seedConfig } from "../helpers/runApp.ts";

// Ninguna de estas pruebas toca la red a propósito: la opción 3 es la única que llama
// al geocoding, y esa lógica ya se cubre en tests/actions/addCity con fetch stubbeado.
// Aquí se ejercita el disco, y una prueba de disco que dependa de OpenMeteo sería
// intermitente.

const ottawa = city({ id: 123, name: "Ottawa" });
const zurich = city({ id: 456, name: "Zurich", region: null, country: "Suiza" });
const ZURICH_LABEL = "Zurich, Suiza";

// Los permisos de chmod sobreviven al test aunque este falle a mitad.
const restores: Array<() => Promise<void>> = [];
afterAll(async () => {
  for (const restore of restores) await restore();
});

async function readOnly(path: string): Promise<void> {
  await chmod(path, 0o444);
  restores.push(async () => {
    await chmod(path, 0o600);
  });
}

test("la opción 8 escribe solo settings.json", async () => {
  const home = await createHome();
  const run = await runApp(["8", "9"], home);

  expect(await listConfigDir(home)).toEqual(["settings.json"]);
  expect(await readConfigFile(home, "settings.json")).toEqual({ unit: "fahrenheit" });
  expect(run.stdout).toContain("Unidad de temperatura: °F.");
});

test("una acción de ciudades escribe solo cities.json", async () => {
  const home = await createHome();
  await seedConfig(home, "cities.json", citiesFile([ottawa, zurich]));

  const run = await runApp(["5", "2", "9"], home);

  expect(await listConfigDir(home)).toEqual(["cities.json"]);
  expect(await readConfigFile(home, "cities.json")).toEqual(citiesFile([ottawa, zurich], 456));
  expect(run.stdout).toContain(`${ZURICH_LABEL} es ahora la ciudad default.`);
});

test("un write fallido no confirma el cambio", async () => {
  const home = await createHome();
  await seedConfig(home, "cities.json", citiesFile([ottawa, zurich]));
  await readOnly(join(configDirOf(home), "cities.json"));

  const run = await runApp(["5", "2", "9"], home);

  expect(run.stderr).toContain("No se pudo guardar la configuración");
  // La invariante: si el disco no guardó, el usuario no debe leer que sí.
  expect(run.stdout).not.toContain("es ahora la ciudad default");
  // Y el config en memoria tampoco avanzó: la app sigue con el default viejo.
  expect(await readConfigFile(home, "cities.json")).toEqual(citiesFile([ottawa, zurich], 123));
});

test("la migración del config.json legacy conserva ciudades, default y unidad", async () => {
  const home = await createHome();
  await seedConfig(home, "config.json", { cities: [ottawa], defaultCityId: 123, unit: "fahrenheit" });

  const run = await runApp(["9"], home);

  // El legacy desaparece una vez que ambas piezas están escritas.
  expect(await listConfigDir(home)).toEqual(["cities.json", "settings.json"]);
  expect(await readConfigFile(home, "cities.json")).toEqual(citiesFile([ottawa], 123));
  expect(await readConfigFile(home, "settings.json")).toEqual({ unit: "fahrenheit" });
  expect(run.stdout).toContain("Ajustes (°F)");
});

test("la migración no pisa un cities.json que ya existe", async () => {
  // Recuperación de una migración a medias: cities.json es la versión más nueva.
  const home = await createHome();
  await seedConfig(home, "cities.json", citiesFile([zurich]));
  await seedConfig(home, "config.json", { cities: [ottawa], defaultCityId: 123, unit: "fahrenheit" });

  await runApp(["9"], home);

  expect(await readConfigFile(home, "cities.json")).toEqual(citiesFile([zurich], 456));
  // settings.json sí se crea desde el legacy: ese archivo no existía.
  expect(await readConfigFile(home, "settings.json")).toEqual({ unit: "fahrenheit" });
});

test("un legacy ilegible no se borra y la app arranca igual", async () => {
  const home = await createHome();
  await seedConfig(home, "config.json", "{ esto no es json");

  const run = await runApp(["9"], home);

  // Arranca con la lista vacía en memoria, sin escribir nada: nada que migrar.
  expect(run.stdout).toContain("Clima de todas las ciudades (0)");
  expect(run.stderr).toBe("");
  expect(await listConfigDir(home)).toEqual(["config.json"]);
});

test("un cities.json corrupto no impide arrancar", async () => {
  const home = await createHome();
  await seedConfig(home, "cities.json", "[]");

  const run = await runApp(["9"], home);

  expect(run.stderr).toBe("");
  expect(run.stdout).toContain("Clima de todas las ciudades (0)");
});

test("el default elegido sobrevive a la siguiente corrida", async () => {
  const home = await createHome();
  await seedConfig(home, "cities.json", citiesFile([ottawa, zurich]));

  await runApp(["5", "2", "9"], home);
  const second = await runApp(["5", "9"], home);

  // En la segunda corrida Zurich ya viene marcada como default desde el disco.
  expect(second.stdout).toContain(`${ZURICH_LABEL} (45.42, -75.70)  (default)`);
});