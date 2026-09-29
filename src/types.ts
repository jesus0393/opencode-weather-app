export type Unit = "celsius" | "fahrenheit";

export interface City {
  id: number;
  name: string;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}

export interface Config {
  cities: City[];
  defaultCityId: number | null;
  unit: Unit;
}

export interface WeatherUnits {
  temperature: string;
  humidity: string;
  windSpeed: string;
}

export interface Weather {
  temperature: number;
  humidity: number;
  weatherCode: number;
  windSpeed: number;
  timeZoneAbbreviation: string;
  units: WeatherUnits;
}
