import { getDailyForecast } from "../api/weather.ts";
import type { AppContext } from "../types/MenuOption.ts";
import { withLoading } from "../presentation/loading.ts";
import { describeError } from "../utils/errors.ts";
import { printSeparator, printWarn } from "../presentation/output.ts";
import { colors } from "../utils/colors.ts";
import { formatCityLabel } from "../utils/format.ts";
import { printForecast } from "./getForecast.ts";
import { NO_CITIES_MESSAGE, describeCities } from "./messages.ts";

export async function showAllForecast({ config }: AppContext): Promise<null> {
  if (config.cities.length === 0) {
    printWarn(NO_CITIES_MESSAGE);
    return null;
  }

  // Un solo spinner para todas, igual que showAllWeather.
  const results = await withLoading(`Consultando el pronóstico de ${describeCities(config.cities.length)}`, () =>
    Promise.allSettled(config.cities.map((city) => getDailyForecast(city, config.unit))),
  );

  results.forEach((result, index) => {
    const city = config.cities[index];
    if (!city) return;

    // Una ciudad con coordenadas inválidas no impide ver las demás.
    if (result.status === "rejected") {
      printSeparator();
      console.log(`  ${formatCityLabel(city)} ${colors.dim("·")} ${colors.red(describeError(result.reason))}`);
      return;
    }
    printForecast(city, result.value);
  });
  return null;
}
