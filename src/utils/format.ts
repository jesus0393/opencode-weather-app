import type { City } from "../types/City.ts";
import type { Unit } from "../types/Config.ts";
import type { DailyForecast, ForecastDay, Weather } from "../types/Weather.ts";
import { colors } from "./colors.ts";
import type { Paint } from "./colors.ts";
import { describeWeatherCode } from "./weatherCodes.ts";

const MAX_LABEL_WIDTH = 40;
const TABLE_INDENT = "  ";
const TABLE_GAP = "  ";

export interface Cell {
  text: string;
  align?: "left" | "right";
  color?: Paint;
}

export function formatUnit(unit: Unit): string {
  return unit === "celsius" ? "°C" : "°F";
}

// Etiqueta compacta: la trunca la tabla de clima, así que no lleva coordenadas.
export function formatCityLabel(city: City): string {
  // Truthy y no `!== null`: parseCity ya normaliza a null, pero un undefined que se
  // colara por otra ruta imprimiría un hueco en la etiqueta.
  return [city.name, city.region, city.country].filter((part): part is string => Boolean(part)).join(", ");
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

// Alinea las columnas de una tabla. El ancho se mide SIEMPRE sobre el texto plano
// y el color se aplica después: los escapes ANSI cuentan como caracteres y
// desalinearían la tabla. La última columna no se rellena para no dejar espacios
// finales.
export function formatTable(rows: Cell[][]): string[] {
  const widths = measureColumnWidths(rows);

  return rows.map((row) => {
    const padded = row.map((cell, column) => pad(cell, widths[column] ?? 0, column === row.length - 1));
    return TABLE_INDENT + padded.join(TABLE_GAP);
  });
}

function measureColumnWidths(rows: Cell[][]): number[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, column) => {
      widths[column] = Math.max(widths[column] ?? 0, cell.text.length);
    });
  }
  return widths;
}

function pad(cell: Cell, width: number, isLast: boolean): string {
  if (isLast) return cell.color ? cell.color(cell.text) : cell.text;

  const fill = cell.align === "right" ? cell.text.padStart(width) : cell.text.padEnd(width);
  return cell.color ? cell.color(fill) : fill;
}

// Lista numerada de ciudades elegibles. defaultId marca la default con "(default)";
// se omite (null) cuando la lista es de candidatos y ninguno es el default.
export function formatCityChoices(cities: City[], defaultId: number | null = null): string[] {
  return cities.map((city, index) => {
    const marker = city.id === defaultId ? colors.cyan("  (default)") : "";
    return `  ${index + 1}. ${formatCityChoice(city)}${marker}`;
  });
}

// Fila de clima de la tabla de ciudades: etiqueta, temperatura y descripción.
export function weatherCells(label: string, temperature: string, description: string): Cell[] {
  return [
    { text: truncate(label, MAX_LABEL_WIDTH) },
    { text: temperature, align: "right", color: colors.yellow },
    { text: description },
  ];
}

// Tabla del pronóstico: una fila por día. La unidad va una sola vez en el rango
// ("9 – 19 °C") en vez de repetirse en cada extremo.
export function forecastCells(day: ForecastDay, forecast: DailyForecast, isToday: boolean): Cell[] {
  const { temperature, windSpeed, precipitationProbability } = forecast.units;

  return [
    { text: formatDayLabel(day.date, isToday), color: isToday ? colors.cyan : undefined },
    { text: describeWeatherCode(day.weatherCode) },
    { text: formatTemperatureRange(day, temperature), align: "right", color: colors.yellow },
    { text: formatPrecipitation(day.precipitationProbability, precipitationProbability), align: "right" },
    { text: `${day.windSpeed} ${windSpeed}`, align: "right" },
  ];
}

// "mié, 30/09". Se formatea en UTC a propósito: `date` es una fecha civil de la
// zona de la ciudad, y parsearla en hora local la correría un día.
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

function formatDayLabel(date: string, isToday: boolean): string {
  const label = DAY_LABEL_FORMAT.format(new Date(`${date}T12:00:00Z`));
  return isToday ? `${label} (hoy)` : label;
}

function formatTemperatureRange(day: ForecastDay, unit: string): string {
  return `${Math.round(day.minTemperature)} – ${Math.round(day.maxTemperature)} ${unit}`;
}

// Sin dato del modelo se muestra "—" en vez de un 0 % que el usuario leería como
// "no va a llover".
function formatPrecipitation(probability: number | null, unit: string): string {
  return probability === null ? "—" : `${probability}${unit}`;
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
