import { getCurrentWeather, searchCities } from "../api/openMeteo.ts";
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
import { askIndex, printError, printSeparator, printSuccess, printWarn } from "./console.ts";
import type { Prompter } from "./console.ts";
import { colors } from "./colors.ts";
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
  console.log(`  ${formatCityLabel(city)} ${colors.dim("·")} ${colors.dim(weather.timeZoneAbbreviation)}`);
  console.log(formatWeatherBlock(weather));
  printSeparator();
  return null;
}

async function showAllWeather({ config }: AppContext): Promise<null> {
  if (config.cities.length === 0) {
    printWarn(NO_CITIES_MESSAGE);
    return null;
  }

  // allSettled para que una ciudad con coordenadas inválidas no impida ver las demás.
  const results = await Promise.allSettled(
    config.cities.map((city) => getCurrentWeather(city, config.unit)),
  );

  const labels = config.cities.map(formatCityLabel);
  const labelWidth = measureLabelWidth(labels);

  printSeparator();
  console.log(`  ${colors.cyan("Clima actual")} ${colors.dim(`· ${formatUnit(config.unit)}`)}\n`);
  results.forEach((result, index) => {
    const label = labels[index];
    if (label === undefined) return;

    if (result.status === "fulfilled") {
      const weather = result.value;
      console.log(
        formatWeatherRow(label, formatTemperature(weather), describeWeatherCode(weather.weatherCode), labelWidth),
      );
    } else {
      const failure = colors.red(`Error: ${describeError(result.reason)}`);
      console.log(formatWeatherRow(label, "—", failure, labelWidth));
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

  const matches = await searchCities(query);
  if (matches.length === 0) {
    printError(`No se encontró ninguna ciudad para "${query}".`);
    return null;
  }

  // Las coincidencias ya guardadas no son accionables: no las ofrecemos para elegir.
  const available = matches.filter((city) => !hasCity(config, city.id));
  if (available.length === 0) {
    printWarn(describeAlreadySaved(matches));
    return null;
  }

  // Con una sola coincidencia no hay nada que desambiguar: se agrega directo.
  const city =
    available.length === 1 ? available[0] : await pickCity(available, ask, "  Número de la ciudad: ");
  if (!city) return null;

  const becomesDefault = config.defaultCityId === null;
  const suffix = becomesDefault ? colors.dim(" como ciudad default") : "";
  printSuccess(`${formatCityLabel(city)} agregada${suffix}.`);
  return addCity(config, city);
}

async function deleteCity({ config, ask }: AppContext): Promise<Config | null> {
  if (config.cities.length === 0) {
    printWarn(NO_CITIES_MESSAGE);
    return null;
  }

  const city = await pickCity(config.cities, ask, "  Número a eliminar: ", config.defaultCityId);
  if (!city) return null;

  const updated = removeCity(config, city.id);
  printSuccess(`${formatCityLabel(city)} eliminada.`);
  announceNewDefault(updated, city.id);
  return updated;
}

async function chooseDefaultCity({ config, ask }: AppContext): Promise<Config | null> {
  if (config.cities.length === 0) {
    printWarn(NO_CITIES_MESSAGE);
    return null;
  }

  const city = await pickCity(config.cities, ask, "  Número como ciudad default: ", config.defaultCityId);
  if (!city) return null;

  if (city.id === config.defaultCityId) {
    printWarn(`${formatCityLabel(city)} ya es la ciudad default.`);
    return null;
  }

  printSuccess(`${formatCityLabel(city)} es ahora la ciudad default.`);
  return setDefaultCity(config, city.id);
}

async function adjustSettings({ config }: AppContext): Promise<Config> {
  const updated = toggleUnit(config);
  printSuccess(`Unidad de temperatura: ${formatUnit(updated.unit)}.`);
  return updated;
}

// Lista numerada + pregunta por un número. defaultId solo pinnela la etiqueta
// "(default)"; en la lista de candidatos del geocoding no hay ninguna.
async function pickCity(
  cities: City[],
  ask: Prompter,
  question: string,
  defaultId: number | null = null,
): Promise<City | null> {
  console.log();
  console.log(formatCityChoices(cities, defaultId).join("\n"));
  console.log();

  const index = await askIndex(ask, question, cities.length);
  if (index === null) return null;
  return cities[index] ?? null;
}

function describeAlreadySaved(matches: City[]): string {
  if (matches.length === 1) {
    const [only] = matches;
    if (only) return `${formatCityLabel(only)} ya está en la lista.`;
  }
  return `Las ${matches.length} coincidencias ya están en la lista.`;
}

function announceNewDefault(config: Config, removedId: number): void {
  const city = defaultCity(config);
  if (!city) {
    printWarn("Ya no queda ninguna ciudad default.");
    return;
  }
  if (removedId === config.defaultCityId) {
    printSuccess(`Nueva ciudad default: ${formatCityLabel(city)}.`);
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
