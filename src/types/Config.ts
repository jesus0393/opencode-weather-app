import type { City } from "./City.ts";

export type Unit = "celsius" | "fahrenheit";

export interface Config {
  cities: City[];
  defaultCityId: number | null;
  unit: Unit;
}
