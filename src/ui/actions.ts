import { getCurrentWeather, geocodeCity } from "../api/openMeteo.ts";
import { describeWeatherCode } from "../api/weatherCodes.ts";
import {
  addCity,
  defaultCity,
  hasCity,
  removeCity,
  setDefaultCity,
  toggleUnit,
} from "../services/cityService.ts";
import type { City, Config } from "../types.ts";
import { askIndex, printError, printSeparator } from "./console.ts";
import type { Prompter } from "./console.ts";
import {
  formatCityChoices,
  formatCityLabel,
  formatTemperature,
  formatUnit,
  formatWeatherBlock,
  formatWeatherRow,
  measureLabelWidth,
} from "./format.ts";

const NO_CITIES_MESSAGE = "No hay ciudades guardadas. Usa la opción 3 para agregar una.";

export interface AppContext {
  config: Config;
  ask: Prompter;
}

// Devuelve la configuración actualizada si hubo cambios que persistir, o null si no.
export type Action = (context: AppContext) => Promise<Config | null>;

async function showDefaultWeather({ config }: AppContext): Promise<null> {
  const city = defaultCity(config);
  if (!city) {
    printError(NO_CITIES_MESSAGE);
    return null;
  }

  const weather = await getCurrentWeather(city, config.unit);
  printSeparator();
  console.log(`  ${formatCityLabel(city)} · ${weather.timeZoneAbbreviation}`);
  console.log(formatWeatherBlock(weather));
  printSeparator();
  return null;
}

async function showAllWeather({ config }: AppContext): Promise<null> {
  if (config.cities.length === 0) {
    printError(NO_CITIES_MESSAGE);
    return null;
  }

  // allSettled para que una ciudad con coordenadas inválidas no impida ver las demás.
  const results = await Promise.allSettled(
    config.cities.map((city) => getCurrentWeather(city, config.unit)),
  );

  const labels = config.cities.map(formatCityLabel);
  const labelWidth = measureLabelWidth(labels);

  printSeparator();
  console.log(`  Clima actual · ${formatUnit(config.unit)}\n`);
  results.forEach((result, index) => {
    const label = labels[index];
    if (label === undefined) return;

    if (result.status === "fulfilled") {
      const weather = result.value;
      console.log(
        formatWeatherRow(label, formatTemperature(weather), describeWeatherCode(weather.weatherCode), labelWidth),
      );
    } else {
      console.log(formatWeatherRow(label, "—", `Error: ${describeError(result.reason)}`, labelWidth));
    }
  });
  printSeparator();
  return null;
}

async function searchAndAddCity({ config, ask }: AppContext): Promise<Config | null> {
  const query = await ask("  Nombre de la ciudad: ");
  if (query === null) return null;

  if (query === "") {
    printError("El nombre de la ciudad no puede estar vacío.");
    return null;
  }

  const city = await geocodeCity(query);
  if (!city) {
    printError(`No se encontró ninguna ciudad para "${query}".`);
    return null;
  }

  if (hasCity(config, city.id)) {
    printError(`${formatCityLabel(city)} ya está en la lista.`);
    return null;
  }

  const becomesDefault = config.defaultCityId === null;
  console.log(`  ${formatCityLabel(city)} agregada${becomesDefault ? " como ciudad default" : ""}.`);
  return addCity(config, city);
}

async function deleteCity({ config, ask }: AppContext): Promise<Config | null> {
  if (config.cities.length === 0) {
    printError(NO_CITIES_MESSAGE);
    return null;
  }

  const city = await pickCity(config, ask, "  Número a eliminar: ");
  if (!city) return null;

  const updated = removeCity(config, city.id);
  console.log(`  ${formatCityLabel(city)} eliminada.`);
  announceNewDefault(updated, city.id);
  return updated;
}

async function chooseDefaultCity({ config, ask }: AppContext): Promise<Config | null> {
  if (config.cities.length === 0) {
    printError(NO_CITIES_MESSAGE);
    return null;
  }

  const city = await pickCity(config, ask, "  Número como ciudad default: ");
  if (!city) return null;

  if (city.id === config.defaultCityId) {
    printError(`${formatCityLabel(city)} ya es la ciudad default.`);
    return null;
  }

  console.log(`  ${formatCityLabel(city)} es ahora la ciudad default.`);
  return setDefaultCity(config, city.id);
}

async function adjustSettings({ config }: AppContext): Promise<Config> {
  const updated = toggleUnit(config);
  console.log(`  Unidad de temperatura: ${formatUnit(updated.unit)}.`);
  return updated;
}

async function pickCity(config: Config, ask: Prompter, question: string): Promise<City | null> {
  console.log();
  console.log(formatCityChoices(config).join("\n"));
  console.log();

  const index = await askIndex(ask, question, config.cities.length);
  if (index === null) return null;
  return config.cities[index] ?? null;
}

function announceNewDefault(config: Config, removedId: number): void {
  const city = defaultCity(config);
  if (!city) {
    console.log("  Ya no queda ninguna ciudad default.");
    return;
  }
  if (removedId === config.defaultCityId) {
    console.log(`  Nueva ciudad default: ${formatCityLabel(city)}.`);
  }
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "error desconocido";
}

export const ACTIONS: Record<string, Action> = {
  "1": showDefaultWeather,
  "2": showAllWeather,
  "3": searchAndAddCity,
  "4": deleteCity,
  "5": chooseDefaultCity,
  "8": adjustSettings,
};
