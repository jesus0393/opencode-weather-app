import { getDailyForecast } from "../api/weather.ts";
import { defaultCity } from "../domain/config.ts";
import type { City } from "../types/City.ts";
import type { AppContext } from "../types/MenuOption.ts";
import type { DailyForecast } from "../types/Weather.ts";
import { withLoading } from "../presentation/loading.ts";
import { printError, printSeparator, printWarn } from "../presentation/output.ts";
import { colors } from "../utils/colors.ts";
import { forecastCells, formatCityLabel, formatTable } from "../utils/format.ts";
import { NO_CITIES_MESSAGE } from "./messages.ts";

export async function showDefaultForecast({ config }: AppContext): Promise<null> {
  const city = defaultCity(config);
  if (!city) {
    printError(NO_CITIES_MESSAGE);
    return null;
  }

  const forecast = await withLoading("Consultando el pronóstico", () => getDailyForecast(city, config.unit));
  printForecast(city, forecast);
  return null;
}

// La tabla del pronóstico la comparten showDefaultForecast y showAllForecast; vive
// aquí porque este módulo es el dueño del pronóstico de una ciudad.
export function printForecast(city: City, forecast: DailyForecast): void {
  printSeparator();
  console.log(`  ${formatCityLabel(city)} ${colors.dim("·")} ${colors.dim(forecast.timeZoneAbbreviation)}\n`);
  if (forecast.days.length === 0) {
    printWarn("OpenMeteo no devolvió días para esta ciudad.");
  } else {
    const rows = forecast.days.map((day, index) => forecastCells(day, forecast, index === 0));
    formatTable(rows).forEach((row) => console.log(row));
  }
  printSeparator();
}
