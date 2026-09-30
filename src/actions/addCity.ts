import { searchCities } from "../api/geocoding.ts";
import { addCity, hasCity } from "../domain/config.ts";
import type { City } from "../types/City.ts";
import type { ActionOutcome, AppContext } from "../types/MenuOption.ts";
import { withLoading } from "../presentation/loading.ts";
import { printError, printWarn } from "../presentation/output.ts";
import { colors } from "../utils/colors.ts";
import { formatCityLabel } from "../utils/format.ts";
import { pickCity } from "./cityPicker.ts";

export async function searchAndAddCity({ config, ask }: AppContext): Promise<ActionOutcome | null> {
  const query = await ask("  Nombre de la ciudad: ");
  if (query === null) return null;

  if (query === "") {
    printError("El nombre de la ciudad no puede estar vacío.");
    return null;
  }

  const matches = await withLoading(`Buscando "${query}"`, () => searchCities(query));
  if (matches.length === 0) {
    printError(`No se encontró ninguna ciudad para "${query}".`);
    return null;
  }

  // Las coincidencias ya guardadas no son accionables: no las ofrecemos para elegir.
  const available = matches.filter((city) => !hasCity(config, city.id));
  if (available.length === 0) {
    printWarn(describeAlreadySaved(matches));
    return null;
  }

  // Con una sola coincidencia no hay nada que desambiguar: se agrega directo.
  const city =
    available.length === 1 ? available[0] : await pickCity(available, ask, "  Número de la ciudad: ");
  if (!city) return null;

  const suffix = config.defaultCityId === null ? colors.dim(" como ciudad default") : "";
  return {
    config: addCity(config, city),
    changed: "cities",
    message: [`${formatCityLabel(city)} agregada${suffix}.`],
  };
}

function describeAlreadySaved(matches: City[]): string {
  if (matches.length === 1) {
    const [only] = matches;
    if (only) return `${formatCityLabel(only)} ya está en la lista.`;
  }
  return `Las ${matches.length} coincidencias ya están en la lista.`;
}
