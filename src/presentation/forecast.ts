import type { City } from "../types/City.ts";
import type { DailyForecast } from "../types/Weather.ts";
import { colors } from "../utils/colors.ts";
import { forecastCells, formatCityLabel, formatTable } from "../utils/format.ts";
import { printSeparator, printWarn } from "./output.ts";

// La tabla del pronóstico la comparten showDefaultForecast y showAllForecast. Vive en
// presentación y no en la acción de la ciudad default: `getAllForecast.ts` la
// importaba de `getForecast.ts`, y dos acciones importándose entre sí es el único
// acoplamiento que quedaba entre ellas.
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
