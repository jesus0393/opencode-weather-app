// Cuerpos de OpenMeteo con la forma exacta que espera api/weather.ts. Viven aquí y no
// en cada test porque las acciones de solo lectura los piden enteros: un test que
// declara solo la ciudad no debería volver a escribir los ocho campos del clima.

export function currentWeatherResponse(overrides: {
  temperature?: number;
  weatherCode?: number;
} = {}): unknown {
  return {
    timezone_abbreviation: "-04",
    current_units: { temperature_2m: "°C", relative_humidity_2m: "%", wind_speed_10m: "km/h" },
    current: {
      temperature_2m: overrides.temperature ?? 21.5,
      relative_humidity_2m: 60,
      weather_code: overrides.weatherCode ?? 0,
      wind_speed_10m: 12.3,
    },
  };
}

export function dailyForecastResponse(dates: string[] = ["2026-09-30", "2026-10-01"]): unknown {
  const length = dates.length;
  return {
    timezone_abbreviation: "-04",
    daily_units: { temperature_2m_max: "°C", wind_speed_10m_max: "km/h", precipitation_probability_max: "%" },
    daily: {
      time: dates,
      weather_code: Array.from({ length }, () => 0),
      temperature_2m_max: Array.from({ length }, (_, i) => 19.2 + i),
      temperature_2m_min: Array.from({ length }, () => 9.4),
      precipitation_probability_max: Array.from({ length }, () => 10),
      wind_speed_10m_max: Array.from({ length }, () => 14.1),
    },
  };
}
