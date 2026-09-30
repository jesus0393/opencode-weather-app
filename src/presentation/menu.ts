import { adjustSettings } from "../actions/adjustSettings.ts";
import { searchAndAddCity } from "../actions/addCity.ts";
import { showAllForecast } from "../actions/getAllForecast.ts";
import { showAllWeather } from "../actions/getAllWeather.ts";
import { showDefaultForecast } from "../actions/getForecast.ts";
import { showDefaultWeather } from "../actions/getWeather.ts";
import { deleteCity } from "../actions/removeCity.ts";
import { chooseDefaultCity } from "../actions/setDefaultCity.ts";
import type { Config } from "../types/Config.ts";
import type { MenuOption } from "../types/MenuOption.ts";
import { colors } from "../utils/colors.ts";
import { formatUnit } from "../utils/format.ts";
import { printSeparator } from "./output.ts";

export const EXIT_OPTION = "9";

// Una opción nueva se declara aquí y en ningún otro sitio: número, etiqueta y
// acción en la misma entrada. Antes el menú se imprimía en console.ts y las acciones
// se registraban aparte en actions.ts, dos listas que ningún tipo unía: olvidar una
// era un bug invisible hasta runtime (opción que nunca se ofrece, o "Opción
// inválida"). El label es una función porque algunas entradas dependen del config,
// p. ej. el conteo de ciudades o la unidad vigente.
export const MENU: readonly MenuOption[] = [
  { option: "1", label: () => "Clima de ciudad default", run: showDefaultWeather },
  {
    option: "2",
    label: (config) => `Clima de todas las ciudades (${config.cities.length})`,
    run: showAllWeather,
  },
  { option: "3", label: () => "Buscar y agregar ciudad", run: searchAndAddCity },
  { option: "4", label: () => "Eliminar ciudad", run: deleteCity },
  { option: "5", label: () => "Establecer ciudad default", run: chooseDefaultCity },
  { option: "6", label: () => "Pronóstico de 7 días (ciudad default)", run: showDefaultForecast },
  {
    option: "7",
    label: (config) => `Pronóstico de 7 días de todas (${config.cities.length})`,
    run: showAllForecast,
  },
  { option: "8", label: (config) => `Ajustes (${formatUnit(config.unit)})`, run: adjustSettings },
];

function printOption(option: string, label: string): void {
  console.log(`  ${colors.cyan(`${option}.`)} ${label}`);
}

export function printMenu(config: Config): void {
  for (const entry of MENU) {
    printOption(entry.option, entry.label(config));
  }
  printOption(EXIT_OPTION, "Salir");
  printSeparator();
}
