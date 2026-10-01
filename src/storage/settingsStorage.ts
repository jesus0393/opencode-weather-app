import { homedir } from "node:os";
import { join } from "node:path";
import type { Unit } from "../types/Config.ts";
import type { SaveResult } from "../types/Storage.ts";
import { readJson, writeJson } from "./jsonFile.ts";

export const SETTINGS_PATH = join(homedir(), ".config", "weather-cli", "settings.json");

const VALID_UNITS: Unit[] = ["celsius", "fahrenheit"];

// Objeto y no la unidad suelta: el archivo se edita a mano y `{ "unit": "..." }`
// sigue siendo legible cuando le sumemos otra preferencia.
export function parseUnit(raw: unknown): Unit {
  const candidate = (typeof raw === "object" && raw !== null ? raw : {}) as { unit?: unknown };
  return isUnit(candidate.unit) ? candidate.unit : "celsius";
}

function isUnit(value: unknown): value is Unit {
  return typeof value === "string" && (VALID_UNITS as string[]).includes(value);
}

// Un archivo corrupto o ausente no debe impedir arrancar: caemos a Celsius.
export async function loadUnit(): Promise<Unit> {
  return parseUnit(await readJson(SETTINGS_PATH));
}

export async function saveUnit(unit: Unit): Promise<SaveResult> {
  return writeJson(SETTINGS_PATH, { unit });
}
