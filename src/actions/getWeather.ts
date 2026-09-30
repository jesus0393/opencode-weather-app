import { getCurrentWeather } from "../api/weather.ts";
import { defaultCity } from "../domain/config.ts";
import type { AppContext } from "../types/MenuOption.ts";
import { withLoading } from "../presentation/loading.ts";
import { printError, printSeparator } from "../presentation/output.ts";
import { colors } from "../utils/colors.ts";
import { formatCityLabel, formatWeatherBlock } from "../utils/format.ts";
import { NO_CITIES_MESSAGE } from "./messages.ts";

export async function showDefaultWeather({ config }: AppContext): Promise<null> {
  const city = defaultCity(config);
  if (!city) {
    printError(NO_CITIES_MESSAGE);
    return null;
  }

  const weather = await withLoading("Consultando el clima", () => getCurrentWeather(city, config.unit));
  printSeparator();
  console.log(`  ${formatCityLabel(city)} ${colors.dim("·")} ${colors.dim(weather.timeZoneAbbreviation)}`);
  console.log(formatWeatherBlock(weather));
  printSeparator();
  return null;
}
