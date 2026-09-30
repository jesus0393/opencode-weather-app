import { rm } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config } from "../types/Config.ts";
import type { ChangedSlice, SaveResult } from "../types/Storage.ts";
import { CITIES_PATH, loadCities, parseCities, saveCities } from "./citiesStorage.ts";
import { exists, readJson } from "./jsonFile.ts";
import { SETTINGS_PATH, loadUnit, parseUnit, saveUnit } from "./settingsStorage.ts";

// El config de una sola versión metía ciudades y unidad en el mismo config.json.
const LEGACY_PATH = join(homedir(), ".config", "weather-cli", "config.json");

// Agrega los dos archivos de storage en el Config que el resto de la app conoce.
export async function loadConfig(): Promise<Config> {
  await migrateLegacyConfig();

  const [cities, unit] = await Promise.all([loadCities(), loadUnit()]);
  return { cities: cities.cities, defaultCityId: cities.defaultCityId, unit };
}

// El loop no reescribe los dos archivos en cada cambio: la acción indica cuál tocó
// y solo ese se guarda. El valor sale del Config nuevo, no de una comparación, para
// que un cambio sin efecto no se confunda con uno que sí lo tuvo.
export function persist(config: Config, slice: ChangedSlice): Promise<SaveResult> {
  return slice === "cities"
    ? saveCities({ cities: config.cities, defaultCityId: config.defaultCityId })
    : saveUnit(config.unit);
}

// Un config.json que no sabemos leer no se borra: se deja ahí como evidencia y la
// app arranca igual con los archivos nuevos (o vacíos). Mismo comportamiento que
// antes, cuando un config roto caía al de fábrica en silencio.
async function migrateLegacyConfig(): Promise<void> {
  const legacy = await readLegacyConfig();
  if (!legacy) return;

  // Nunca sobreescribe un archivo que ya existe. Si una migración anterior quedó a
  // medias y el usuario ya guardó algo, ese archivo es la versión más nueva y
  // reescribirlo desde el legacy perdería ese cambio.
  if (!(await exists(CITIES_PATH))) {
    const saved = await saveCities({ cities: legacy.cities, defaultCityId: legacy.defaultCityId });
    if (!saved.ok) return;
  }

  if (!(await exists(SETTINGS_PATH))) {
    const saved = await saveUnit(legacy.unit);
    if (!saved.ok) return;
  }

  // Las dos piezas ya están en disco, así que el legacy ya no aporta nada. Si no se
  // puede borrar, las próximas corridas lo ignoran por el exists() de arriba.
  try {
    await rm(LEGACY_PATH, { force: true });
  } catch {
    // Sin consecuencias: el legacy solo se lee si faltan los archivos nuevos.
  }
}

// null = no hay legacy, o no es un objeto con la forma esperada.
async function readLegacyConfig(): Promise<Config | null> {
  const raw = await readJson(LEGACY_PATH);
  if (typeof raw !== "object" || raw === null) return null;

  // Se reutilizan los validadores de los archivos nuevos: la migración no puede
  // aceptar datos que la app ya no aceptaría en su formato actual. Ambos leen el
  // legacy entero, que tiene la misma forma `{ cities, defaultCityId, unit }`.
  const cities = parseCities(raw);
  const unit = parseUnit(raw);
  return { cities: cities.cities, defaultCityId: cities.defaultCityId, unit };
}
