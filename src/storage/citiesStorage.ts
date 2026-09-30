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

function isCity(value: unknown): value is City {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<City>;
  return (
    typeof candidate.id === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.latitude === "number" &&
    typeof candidate.longitude === "number"
  );
}

// El archivo es editable a mano, así que validamos en vez de castear a ciegas.
// `defaultCityId` se re-resuelve: puede apuntar a una ciudad que ya no está.
export function parseCities(raw: unknown): CitiesFile {
  if (typeof raw !== "object" || raw === null) return emptyCities();

  const candidate = raw as Partial<CitiesFile>;
  const cities = Array.isArray(candidate.cities) ? candidate.cities.filter(isCity) : [];
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
