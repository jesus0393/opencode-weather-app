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

export interface DailyForecastUnits {
  temperature: string;
  windSpeed: string;
  precipitationProbability: string;
}

// `date` viene como "2026-09-30" en la zona horaria de la ciudad: es una fecha
// civil, no un instante. Parsearla con `new Date(...)` en hora local la correría un
// día hacia atrás en las ciudades con UTC negativo.
export interface ForecastDay {
  date: string;
  weatherCode: number;
  minTemperature: number;
  maxTemperature: number;
  // La API devuelve null cuando el modelo no trae el dato para ese punto.
  precipitationProbability: number | null;
  windSpeed: number;
}

export interface DailyForecast {
  days: ForecastDay[];
  timeZoneAbbreviation: string;
  units: DailyForecastUnits;
}
