import { getCurrentWeather } from "../api/weather.ts";
import { withLoading } from "../presentation/loading.ts";
import { printSeparator, printWarn } from "../presentation/output.ts";
import type { AppContext } from "../types/MenuOption.ts";
import { colors } from "../utils/colors.ts";
import { describeError } from "../utils/errors.ts";
import { formatCityLabel, formatTable, formatTemperature, formatUnit, weatherCells } from "../utils/format.ts";
import { describeWeatherCode } from "../utils/weatherCodes.ts";
import { NO_CITIES_MESSAGE, describeCities } from "./messages.ts";

export async function showAllWeather({ config }: AppContext): Promise<null> {
  if (config.cities.length === 0) {
    printWarn(NO_CITIES_MESSAGE);
    return null;
  }

  // Un solo spinner para todas: cada petición con el suyo se pelearían por la línea.
  const total = config.cities.length;
  const results = await withLoading(`Consultando el clima de ${describeCities(total)}`, () =>
    // allSettled para que una ciudad con coordenadas inválidas no impida ver las demás.
    Promise.allSettled(config.cities.map((city) => getCurrentWeather(city, config.unit))),
  );

  const labels = config.cities.map(formatCityLabel);
  const rows = results.map((result, index) => {
    const label = labels[index] ?? "";
    if (result.status === "fulfilled") {
      return weatherCells(label, formatTemperature(result.value), describeWeatherCode(result.value.weatherCode));
    }
    return weatherCells(label, "—", colors.red(`Error: ${describeError(result.reason)}`));
  });

  printSeparator();
  console.log(`  ${colors.cyan("Clima actual")} ${colors.dim(`· ${formatUnit(config.unit)}`)}\n`);
  formatTable(rows).forEach((row) => console.log(row));
  printSeparator();
  return null;
}
