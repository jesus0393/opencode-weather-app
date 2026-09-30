import { describeWeatherCode } from "../api/weatherCodes.ts";
import type { City, Unit, Weather } from "../types.ts";
import { colors } from "./colors.ts";

const MAX_LABEL_WIDTH = 40;
const TEMPERATURE_WIDTH = 7;

export function formatUnit(unit: Unit): string {
  return unit === "celsius" ? "°C" : "°F";
}

// Etiqueta compacta: la trunca la tabla de clima, así que no lleva coordenadas.
export function formatCityLabel(city: City): string {
  return [city.name, city.region, city.country].filter((part) => part !== null).join(", ");
}

// Etiqueta detallada para los selectores: geocoding devuelve lugares distintos con
// el mismo nombre ("Morelia, Chiapas" aparece 3 veces), y sin coordenadas el
// usuario no tiene con qué distinguirlos.
export function formatCityChoice(city: City): string {
  return `${formatCityLabel(city)} ${colors.dim(formatCoordinates(city))}`;
}

function formatCoordinates(city: City): string {
  return `(${city.latitude.toFixed(2)}, ${city.longitude.toFixed(2)})`;
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

// Lista numerada de ciudades elegibles. defaultId marca la default con "(default)";
// se omite (null) cuando la lista es de candidatos y ninguno es el default.
export function formatCityChoices(cities: City[], defaultId: number | null = null): string[] {
  return cities.map((city, index) => {
    const marker = city.id === defaultId ? colors.cyan("  (default)") : "";
    return `  ${index + 1}. ${formatCityChoice(city)}${marker}`;
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
