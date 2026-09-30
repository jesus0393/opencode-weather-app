import type { City } from "../../src/types/City.ts";
import type { Config, Unit } from "../../src/types/Config.ts";
import type { DailyForecast, ForecastDay, Weather } from "../../src/types/Weather.ts";

// Fábricas con valores por omisión: cada test declara solo lo que le importa y el
// resto de tests no se rompen cuando una interfaz crece.

// La forma que devuelve el geocoding, que no es la de City: la región llega como
// `admin1`, y el mapeo a City es justo lo que se quiere ejercitar.
export interface GeocodingResult {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

export function geocodingResult(overrides: Partial<GeocodingResult> = {}): GeocodingResult {
  return {
    id: 123,
    name: "Ottawa",
    admin1: "Ontario",
    country: "Canadá",
    latitude: 45.42,
    longitude: -75.7,
    ...overrides,
  };
}

export function city(overrides: Partial<City> = {}): City {
  return {
    id: 123,
    name: "Ottawa",
    region: "Ontario",
    country: "Canadá",
    latitude: 45.42,
    longitude: -75.7,
    ...overrides,
  };
}

export function config(overrides: Partial<Config> = {}): Config {
  return {
    cities: [],
    defaultCityId: null,
    unit: "celsius",
    ...overrides,
  };
}

// La forma del archivo cities.json: solo ciudades y default. Deliberadamente no es
// `config({...})`, porque cities.json no guarda la unidad.
export function citiesFile(cities: City[], defaultCityId: number | null = cities[0]?.id ?? null) {
  return { cities, defaultCityId };
}

export function configWithCities(cities: City[], unit: Unit = "celsius"): Config {
  return config({ cities, defaultCityId: cities[0]?.id ?? null, unit });
}

export function weather(overrides: Partial<Weather> = {}): Weather {
  return {
    temperature: 21.5,
    humidity: 60,
    weatherCode: 0,
    windSpeed: 12.3,
    timeZoneAbbreviation: "-04",
    units: { temperature: "°C", humidity: "%", windSpeed: "km/h" },
    ...overrides,
  };
}

export function forecastDay(overrides: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date: "2026-09-30",
    weatherCode: 0,
    minTemperature: 9.4,
    maxTemperature: 19.2,
    precipitationProbability: 10,
    windSpeed: 14.1,
    ...overrides,
  };
}

export function dailyForecast(days: ForecastDay[]): DailyForecast {
  return {
    days,
    timeZoneAbbreviation: "-04",
    units: { temperature: "°C", windSpeed: "km/h", precipitationProbability: "%" },
  };
}

// Prompter que responde con las líneas en orden y devuelve null (stdin cerrado)
// cuando se agotan. Es lo que permite probar las acciones sin terminal.
export function scriptedPrompter(...answers: string[]) {
  const pending = [...answers];
  const asked: string[] = [];

  const ask = async (question: string): Promise<string | null> => {
    asked.push(question);
    return pending.shift() ?? null;
  };

  return { ask, asked };
}