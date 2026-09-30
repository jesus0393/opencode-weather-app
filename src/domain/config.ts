import type { City } from "../types/City.ts";
import type { Config } from "../types/Config.ts";

// Operaciones puras sobre la configuración: reciben un Config y devuelven uno nuevo.
// Sin I/O, para que las acciones y el storage puedan depender de ellas sin arrastrar
// el disco.

export function resolveDefaultCityId(cities: City[], preferredId: number | null): number | null {
  return cities.find((city) => city.id === preferredId)?.id ?? cities[0]?.id ?? null;
}

export function findCity(config: Config, id: number | null): City | null {
  if (id === null) return null;
  return config.cities.find((city) => city.id === id) ?? null;
}

export function defaultCity(config: Config): City | null {
  return findCity(config, config.defaultCityId);
}

export function hasCity(config: Config, id: number): boolean {
  return config.cities.some((city) => city.id === id);
}

export function addCity(config: Config, city: City): Config {
  if (hasCity(config, city.id)) return config;

  const cities = [...config.cities, city];
  return {
    ...config,
    cities,
    defaultCityId: config.defaultCityId ?? city.id,
  };
}

export function removeCity(config: Config, id: number): Config {
  const cities = config.cities.filter((city) => city.id !== id);
  if (cities.length === config.cities.length) return config;

  return {
    ...config,
    cities,
    defaultCityId: resolveDefaultCityId(cities, config.defaultCityId),
  };
}

export function setDefaultCity(config: Config, id: number): Config {
  if (!hasCity(config, id)) return config;
  return { ...config, defaultCityId: id };
}

export function toggleUnit(config: Config): Config {
  const unit = config.unit === "celsius" ? "fahrenheit" : "celsius";
  return { ...config, unit };
}
