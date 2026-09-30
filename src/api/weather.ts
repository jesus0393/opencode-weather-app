import type { City } from "../types/City.ts";
import type { Unit } from "../types/Config.ts";
import type { DailyForecast, ForecastDay, Weather } from "../types/Weather.ts";
import { fetchJson } from "./http.ts";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CURRENT_FIELDS = "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m";
const DAILY_FIELDS = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max";
const FORECAST_DAYS = 7;

interface CurrentWeatherResponse {
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

// `daily` son arrays paralelos, uno por variable: el índice i de cada uno es el
// mismo día. La API puede dejar null en los valores que no calculó.
interface DailyForecastResponse {
  timezone_abbreviation: string;
  daily_units: {
    temperature_2m_max: string;
    wind_speed_10m_max: string;
    precipitation_probability_max: string;
  };
  daily: {
    time: string[];
    weather_code: Array<number | null>;
    temperature_2m_max: Array<number | null>;
    temperature_2m_min: Array<number | null>;
    precipitation_probability_max: Array<number | null>;
    wind_speed_10m_max: Array<number | null>;
  };
}

export async function getCurrentWeather(city: City, unit: Unit): Promise<Weather> {
  const params = locationParams(city, unit);
  params.set("current", CURRENT_FIELDS);
  const data = await fetchJson<CurrentWeatherResponse>(`${FORECAST_URL}?${params}`);

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

export async function getDailyForecast(city: City, unit: Unit): Promise<DailyForecast> {
  const params = locationParams(city, unit);
  params.set("daily", DAILY_FIELDS);
  params.set("forecast_days", String(FORECAST_DAYS));
  const data = await fetchJson<DailyForecastResponse>(`${FORECAST_URL}?${params}`);

  return {
    days: zipDays(data.daily),
    timeZoneAbbreviation: data.timezone_abbreviation,
    units: {
      temperature: data.daily_units.temperature_2m_max,
      windSpeed: data.daily_units.wind_speed_10m_max,
      precipitationProbability: data.daily_units.precipitation_probability_max,
    },
  };
}

// Bloque común a los dos endpoints del pronóstico: quién es la ciudad y en qué
// unidades y zona horaria leer sus datos.
function locationParams(city: City, unit: Unit): URLSearchParams {
  return new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    temperature_unit: unit,
    timezone: "auto",
  });
}

// `daily` llega como arrays paralelos: el índice i de cada uno es el mismo día.
function zipDays(daily: DailyForecastResponse["daily"]): ForecastDay[] {
  return daily.time.flatMap((date, index) => {
    const weatherCode = daily.weather_code[index];
    const minTemperature = daily.temperature_2m_min[index];
    const maxTemperature = daily.temperature_2m_max[index];
    const windSpeed = daily.wind_speed_10m_max[index];
    // Un día al que le falte un valor no se puede mostrar: mejor omitirlo que
    // rellenar con ceros que el usuario leería como datos reales.
    if (weatherCode == null || minTemperature == null || maxTemperature == null || windSpeed == null) {
      return [];
    }

    return [
      {
        date,
        weatherCode,
        minTemperature,
        maxTemperature,
        // Este sí es opcional en la API: el modelo puede no dar probabilidad.
        precipitationProbability: daily.precipitation_probability_max[index] ?? null,
        windSpeed,
      },
    ];
  });
}
