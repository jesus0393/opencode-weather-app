import { getDailyForecast } from "../api/weather.ts";
import { defaultCity } from "../domain/config.ts";
import { printForecast } from "../presentation/forecast.ts";
import { withLoading } from "../presentation/loading.ts";
import { printWarn } from "../presentation/output.ts";
import type { AppContext } from "../types/MenuOption.ts";
import { NO_CITIES_MESSAGE } from "./messages.ts";

export async function showDefaultForecast({ config }: AppContext): Promise<null> {
  const city = defaultCity(config);
  if (!city) {
    printWarn(NO_CITIES_MESSAGE);
    return null;
  }

  const forecast = await withLoading("Consultando el pronóstico", () => getDailyForecast(city, config.unit));
  printForecast(city, forecast);
  return null;
}
