import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { City, Config, Unit } from "../types.ts";
import { resolveDefaultCityId } from "./cityService.ts";

const CONFIG_PATH = join(homedir(), ".config", "weather-cli", "config.json");

const VALID_UNITS: Unit[] = ["celsius", "fahrenheit"];

export function defaultConfig(): Config {
  return { cities: [], defaultCityId: null, unit: "celsius" };
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

function parseUnit(value: unknown): Unit {
  return VALID_UNITS.includes(value as Unit) ? (value as Unit) : "celsius";
}

// El archivo es editable a mano, así que validamos en lugar de castear a ciegas.
function parseConfig(raw: unknown): Config {
  if (typeof raw !== "object" || raw === null) return defaultConfig();

  const candidate = raw as Partial<Config>;
  const cities = Array.isArray(candidate.cities) ? candidate.cities.filter(isCity) : [];
  const preferredId = typeof candidate.defaultCityId === "number" ? candidate.defaultCityId : null;

  return {
    cities,
    defaultCityId: resolveDefaultCityId(cities, preferredId),
    unit: parseUnit(candidate.unit),
  };
}

// Un config corrupto no debe impedir arrancar: caemos al de fábrica.
export async function loadConfig(): Promise<Config> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    return parseConfig(JSON.parse(raw));
  } catch {
    return defaultConfig();
  }
}

export async function saveConfig(config: Config): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function configLocation(): string {
  return CONFIG_PATH;
}
