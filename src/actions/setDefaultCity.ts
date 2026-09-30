import { setDefaultCity } from "../domain/config.ts";
import type { ActionOutcome, AppContext } from "../types/MenuOption.ts";
import { printWarn } from "../presentation/output.ts";
import { formatCityLabel } from "../utils/format.ts";
import { pickCity } from "./cityPicker.ts";
import { NO_CITIES_MESSAGE } from "./messages.ts";

export async function chooseDefaultCity({ config, ask }: AppContext): Promise<ActionOutcome | null> {
  if (config.cities.length === 0) {
    printWarn(NO_CITIES_MESSAGE);
    return null;
  }

  const city = await pickCity(config.cities, ask, "  Número como ciudad default: ", config.defaultCityId);
  if (!city) return null;

  if (city.id === config.defaultCityId) {
    printWarn(`${formatCityLabel(city)} ya es la ciudad default.`);
    return null;
  }

  return {
    config: setDefaultCity(config, city.id),
    changed: "cities",
    message: [`${formatCityLabel(city)} es ahora la ciudad default.`],
  };
}
