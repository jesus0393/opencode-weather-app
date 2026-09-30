import { defaultCity, removeCity } from "../domain/config.ts";
import type { Config } from "../types/Config.ts";
import type { ActionOutcome, AppContext } from "../types/MenuOption.ts";
import { printWarn } from "../presentation/output.ts";
import { formatCityLabel } from "../utils/format.ts";
import { pickCity } from "./cityPicker.ts";
import { NO_CITIES_MESSAGE } from "./messages.ts";

export async function deleteCity({ config, ask }: AppContext): Promise<ActionOutcome | null> {
  if (config.cities.length === 0) {
    printWarn(NO_CITIES_MESSAGE);
    return null;
  }

  const city = await pickCity(config.cities, ask, "  Número a eliminar: ", config.defaultCityId);
  if (!city) return null;

  const updated = removeCity(config, city.id);
  return {
    config: updated,
    changed: "cities",
    message: [
      `${formatCityLabel(city)} eliminada.`,
      ...describeNewDefault(updated, city.id === config.defaultCityId),
    ],
  };
}

// removedTheDefault lo calcula el caller con el config de ANTES de borrar:
// removeCity ya reasignó defaultCityId, así que comparar contra el config
// actualizado haría que esta rama nunca se cumpliera.
//
// El aviso de "no queda ninguna" es inmediato, la línea de la nueva default se
// difiere al mensaje de confirmación: si el guardado falla, no hay default nuevo
// que anunciar.
function describeNewDefault(updated: Config, removedTheDefault: boolean): string[] {
  if (!removedTheDefault) return [];

  const city = defaultCity(updated);
  if (!city) {
    printWarn("Ya no queda ninguna ciudad default.");
    return [];
  }
  return [`Nueva ciudad default: ${formatCityLabel(city)}.`];
}
