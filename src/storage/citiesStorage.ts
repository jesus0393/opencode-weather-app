import { homedir } from "node:os";
import { join } from "node:path";
import { resolveDefaultCityId } from "../domain/config.ts";
import type { City } from "../types/City.ts";
import type { SaveResult } from "../types/Storage.ts";
import { readJson, writeJson } from "./jsonFile.ts";

export const CITIES_PATH = join(homedir(), ".config", "weather-cli", "cities.json");

// `defaultCityId` vive aquí y no en settings.json a propósito: las acciones de
// ciudades escriben las dos cosas en un solo archivo, así que ninguna operación
// necesita tocar los dos y no existe una transacción de dos escrituras que pueda
// quedar a medias.
export interface CitiesFile {
  cities: City[];
  defaultCityId: number | null;
}

function emptyCities(): CitiesFile {
  return { cities: [], defaultCityId: null };
}

// El archivo es editable a mano, así que validamos en vez de castear a ciegas: una
// ciudad con `region: 42` o `country: true` se descarta, no se propaga como si fuera
// un string. `region` y `country` ausentes se normalizan a null en vez de quedar
// `undefined`, que era lo que terminaba imprimiendo una etiqueta con huecos.
function parseCity(value: unknown): City | null {
  if (typeof value !== "object" || value === null) return null;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate["id"] !== "number" || typeof candidate["name"] !== "string") return null;
  if (typeof candidate["latitude"] !== "number" || typeof candidate["longitude"] !== "number") return null;

  const region = optionalText(candidate["region"]);
  const country = optionalText(candidate["country"]);
  if (region === undefined || country === undefined) return null;

  return {
    id: candidate["id"],
    name: candidate["name"],
    region,
    country,
    latitude: candidate["latitude"],
    longitude: candidate["longitude"],
  };
}

// null = presente y válido; undefined = presente pero del tipo equivocado.
function optionalText(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  return typeof value === "string" ? value : undefined;
}

// `defaultCityId` se re-resuelve: puede apuntar a una ciudad que ya no está.
export function parseCities(raw: unknown): CitiesFile {
  if (typeof raw !== "object" || raw === null) return emptyCities();

  const candidate = raw as Partial<CitiesFile>;
  const cities = Array.isArray(candidate.cities)
    ? candidate.cities.flatMap((entry) => {
        const city = parseCity(entry);
        return city ? [city] : [];
      })
    : [];
  const preferredId = typeof candidate.defaultCityId === "number" ? candidate.defaultCityId : null;

  return { cities, defaultCityId: resolveDefaultCityId(cities, preferredId) };
}

// Un archivo corrupto o ausente no debe impedir arrancar: caemos al vacío.
export async function loadCities(): Promise<CitiesFile> {
  return parseCities(await readJson(CITIES_PATH));
}

export async function saveCities(file: CitiesFile): Promise<SaveResult> {
  return writeJson(CITIES_PATH, file);
}
