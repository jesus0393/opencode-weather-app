import { describeWeatherCode } from "../api/weatherCodes.ts";
import type { City, Config, Unit, Weather } from "../types.ts";

const MAX_LABEL_WIDTH = 40;
const TEMPERATURE_WIDTH = 7;

export function formatUnit(unit: Unit): string {
  return unit === "celsius" ? "°C" : "°F";
}

export function formatCityLabel(city: City): string {
  return [city.name, city.region, city.country].filter((part) => part !== null).join(", ");
}

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
    const marker = city.id === config.defaultCityId ? "  (default)" : "";
    return `  ${index + 1}. ${formatCityLabel(city)}${marker}`;
  });
}

export function formatWeatherRow(
  label: string,
  temperature: string,
  description: string,
  labelWidth: number,
): string {
  const paddedLabel = truncate(label, labelWidth).padEnd(labelWidth);
  return `  ${paddedLabel} ${temperature.padStart(TEMPERATURE_WIDTH)}  ${description}`;
}

export function formatWeatherBlock(weather: Weather): string {
  return [
    `  Clima:       ${describeWeatherCode(weather.weatherCode)}`,
    `  Temperatura: ${formatTemperature(weather)}`,
    `  Humedad:     ${weather.humidity}${weather.units.humidity}`,
    `  Viento:      ${weather.windSpeed} ${weather.units.windSpeed}`,
  ].join("\n");
}
