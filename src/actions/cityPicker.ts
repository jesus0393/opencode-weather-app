import type { City } from "../types/City.ts";
import type { Prompter } from "../types/Prompter.ts";
import { askIndex } from "../presentation/input.ts";
import { formatCityChoices } from "../utils/format.ts";

// Lista numerada + pregunta por un número. defaultId solo pinela la etiqueta
// "(default)"; en la lista de candidatos del geocoding no hay ninguna.
export async function pickCity(
  cities: City[],
  ask: Prompter,
  question: string,
  defaultId: number | null = null,
): Promise<City | null> {
  console.log();
  console.log(formatCityChoices(cities, defaultId).join("\n"));
  console.log();

  const index = await askIndex(ask, question, cities.length);
  if (index === null) return null;
  return cities[index] ?? null;
}
