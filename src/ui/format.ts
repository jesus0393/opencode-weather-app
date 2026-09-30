import { describeWeatherCode } from "../api/weatherCodes.ts";
import type { City, Config, Unit, Weather } from "../types.ts";
import { colors } from "./colors.ts";

const MAX_LABEL_WIDTH = 40;
const TEMPERATURE_WIDTH = 7;

export function formatUnit(unit: Unit): string {
  return unit === "celsius" ? "°C" : "°F";
}

export function formatCityLabel(city: City): string {
  return [city.name, city.region, city.country].filter((part) => part !== null).join(", ");
}

// Texto plano: quien lo muestra decide el color, para no arrastrar escapes ANSI
// en los cálculos de ancho de columna.
export function formatTemperature(weather: Weather): string {
  return `${weather.temperature}${weather.units.temperature}`;
}

function truncate(value: string, width: number): string {
  return value.length > width ? `${value.slice(0, width - 1)}…` : value;
}

// Alinea la columna de etiquetas entre todas las filas de una misma tabla.
export function measureLabelWidth(labels: string[]): number {
  const longest = labels.reduce((longestSoFar, label) => Math.max(longestSoFar, label.length), 0);
  return Math.min(longest, MAX_LABEL_WIDTH);
}

export function formatCityChoices(config: Config): string[] {
  return config.cities.map((city, index) => {
    const marker = city.id === config.defaultCityId ? colors.cyan("  (default)") : "";
    return `  ${index + 1}. ${formatCityLabel(city)}${marker}`;
  });
}

// El relleno se calcula sobre el texto plano y el color se aplica después: los
// escapes ANSI se contarían como caracteres y desalinearían la tabla.
export function formatWeatherRow(
  label: string,
  temperature: string,
  description: string,
  labelWidth: number,
): string {
  const paddedLabel = truncate(label, labelWidth).padEnd(labelWidth);
  const paddedTemperature = temperature.padStart(TEMPERATURE_WIDTH);
  return `  ${paddedLabel} ${colors.yellow(paddedTemperature)}  ${description}`;
}

export function formatWeatherBlock(weather: Weather): string {
  const label = (text: string): string => colors.dim(`  ${text.padEnd(13)}`);
  return [
    `${label("Clima:")}${describeWeatherCode(weather.weatherCode)}`,
    `${label("Temperatura:")}${colors.yellow(formatTemperature(weather))}`,
    `${label("Humedad:")}${weather.humidity}${weather.units.humidity}`,
    `${label("Viento:")}${weather.windSpeed} ${weather.units.windSpeed}`,
  ].join("\n");
}
