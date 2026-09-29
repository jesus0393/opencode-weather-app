import type { City, Unit, Weather } from "../types.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CURRENT_FIELDS = "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m";
const REQUEST_TIMEOUT_MS = 10_000;

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface GeocodingResponse {
  // La API omite el campo por completo cuando no hay coincidencias.
  results?: GeocodingResult[];
}

interface ForecastResponse {
  timezone_abbreviation: string;
  current_units: {
    temperature_2m: string;
    relative_humidity_2m: string;
    wind_speed_10m: string;
  };
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  try {
    // Sin timeout, una conexión estancada dejaría el menú colgado de forma indefinida.
    const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`OpenMeteo respondió ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new Error("OpenMeteo no respondió a tiempo. Intenta de nuevo.");
    }
    throw error;
  }
}

export async function geocodeCity(query: string): Promise<City | null> {
  const params = new URLSearchParams({
    name: query,
    count: "1",
    language: "es",
    format: "json",
  });
  const data = await fetchJson<GeocodingResponse>(`${GEOCODING_URL}?${params}`);
  const [result] = data.results ?? [];
  if (!result) return null;

  return {
    id: result.id,
    name: result.name,
    region: result.admin1 ?? null,
    country: result.country ?? null,
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

export async function getCurrentWeather(city: City, unit: Unit): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: CURRENT_FIELDS,
    temperature_unit: unit,
    timezone: "auto",
  });
  const data = await fetchJson<ForecastResponse>(`${FORECAST_URL}?${params}`);

  return {
    temperature: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    weatherCode: data.current.weather_code,
    windSpeed: data.current.wind_speed_10m,
    timeZoneAbbreviation: data.timezone_abbreviation,
    units: {
      temperature: data.current_units.temperature_2m,
      humidity: data.current_units.relative_humidity_2m,
      windSpeed: data.current_units.wind_speed_10m,
    },
  };
}
