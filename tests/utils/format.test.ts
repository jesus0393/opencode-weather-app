import { describe, expect, test } from "bun:test";
import { colors } from "../../src/utils/colors.ts";
import type { Cell } from "../../src/utils/format.ts";
import {
  formatCityChoice,
  formatCityChoices,
  formatCityLabel,
  formatTable,
  formatUnit,
  formatWeatherBlock,
  forecastCells,
  weatherCells,
} from "../../src/utils/format.ts";
import { city, dailyForecast, forecastDay, weather } from "../helpers/factories.ts";
import { forceColors, plainColors, stripAnsi } from "../helpers/colors.ts";

const ottawa = city({ id: 123, name: "Ottawa" });

describe("formatUnit", () => {
  test("traduce la unidad a su símbolo", () => {
    expect(formatUnit("celsius")).toBe("°C");
    expect(formatUnit("fahrenheit")).toBe("°F");
  });
});

describe("formatCityLabel", () => {
  test("omite las partes ausentes", () => {
    expect(formatCityLabel(city({ region: null, country: null }))).toBe("Ottawa");
    expect(formatCityLabel(city({ country: null }))).toBe("Ottawa, Ontario");
    expect(formatCityLabel(ottawa)).toBe("Ottawa, Ontario, Canadá");
  });

  test("formatCityChoice añade las coordenadas", () => {
    // Sin coordenadas, tres "Morelia" son indistinguibles en el selector.
    const zurich = city({ name: "Zurich", latitude: 47.37, longitude: 8.54 });

    plainColors();
    expect(formatCityChoice(zurich)).toBe("Zurich, Ontario, Canadá (47.37, 8.54)");
  });
});

describe("formatTable", () => {
  // weatherCells devuelve una fila; formatTable recibe la tabla completa.
  const weatherRows = (): Cell[][] => [
    weatherCells("Ottawa", "21.5°C", "Despejado"),
    weatherCells("Zürich", "9°C", "Tormenta con granizo fuerte"),
  ];

  test("no deja espacios al final de la línea", () => {
    for (const row of formatTable(weatherRows())) {
      expect(row).toBe(row.trimEnd());
    }
  });

  test("las columnas quedan alineadas", () => {
    const rows = formatTable([
      weatherCells("Corto", "1°C", "Despejado"),
      weatherCells("Una etiqueta mucho más larga", "12.5°C", "Nublado"),
    ]);

    // La columna de temperatura acaba en el mismo punto en ambas filas.
    const ends = rows.map((row) => row.indexOf("°C") + "°C".length);
    expect(ends[0]).toBe(ends[1]);
  });

  test("el ancho se mide sobre el texto plano, no sobre el color", () => {
    // Es la invariante: si el ancho se midiera con los escapes dentro, con color la
    // tabla se desalinearía y este assert fallaría.
    plainColors();
    const plain = formatTable(weatherRows()).map(stripAnsi);

    forceColors();
    const colored = formatTable(weatherRows()).map(stripAnsi);

    expect(colored).toEqual(plain);
  });

  test("con color activo las celdas sí llevan escapes", () => {
    forceColors();
    const [row] = formatTable(weatherRows());

    expect(row).toContain(colors.yellow("21.5°C"));
  });

  test("la última columna no se rellena, para no dejar cola", () => {
    expect(formatTable(weatherRows())[0]).not.toMatch(/\s$/);
  });
});

describe("formatCityChoices", () => {
  test("numera desde 1", () => {
    const lines = formatCityChoices([ottawa, city({ id: 456, name: "Zurich" })]);

    expect(lines[0]).toStartWith("  1. Ottawa");
    expect(lines[1]).toStartWith("  2. Zurich");
  });

  test("marca la default y solo esa", () => {
    const lines = formatCityChoices([ottawa, city({ id: 456 })], 456);

    expect(lines[0]).not.toContain("(default)");
    expect(lines[1]).toContain("(default)");
  });
});

describe("forecastCells", () => {
  // `daily.time` trae "2026-09-30", la fecha civil de la ciudad, no un instante.
  // Parsearla en hora local la correría un día hacia atrás en cualquier zona con UTC
  // negativo, que es donde viven la mayoría de las ciudades.
  test("una fecha civil no se corre un día", () => {
    const cells = forecastCells(forecastDay({ date: "2026-09-30" }), dailyForecast([]), false);

    expect(cells[0]?.text).toBe("mié, 30/09");
  });

  test("la etiqueta no depende de la zona horaria del proceso", () => {
    const previous = process.env["TZ"];
    process.env["TZ"] = "Pacific/Kiritimati"; // UTC+14, el caso extremo

    try {
      const cells = forecastCells(forecastDay({ date: "2026-09-30" }), dailyForecast([]), false);
      expect(cells[0]?.text).toBe("mié, 30/09");
    } finally {
      if (previous === undefined) delete process.env["TZ"];
      else process.env["TZ"] = previous;
    }
  });

  test("el primer día se marca como hoy", () => {
    const cells = forecastCells(forecastDay({ date: "2026-09-30" }), dailyForecast([]), true);

    expect(cells[0]?.text).toBe("mié, 30/09 (hoy)");
  });

  test("la unidad va una sola vez, en el rango", () => {
    const cells = forecastCells(
      forecastDay({ minTemperature: 9.4, maxTemperature: 19.2 }),
      dailyForecast([]),
      false,
    );

    expect(cells[2]?.text).toBe("9 – 19 °C");
  });

  test("sin probabilidad del modelo se muestra — y no 0 %", () => {
    const cells = forecastCells(forecastDay({ precipitationProbability: null }), dailyForecast([]), false);

    expect(cells[3]?.text).toBe("—");
  });

  test("la descripción del día viene del código WMO", () => {
    const cells = forecastCells(forecastDay({ weatherCode: 95 }), dailyForecast([]), false);

    expect(cells[1]?.text).toBe("Tormenta");
  });
});

describe("formatWeatherBlock", () => {
  test("las cuatro líneas con sus unidades", () => {
    const block = stripAnsi(formatWeatherBlock(weather({ weatherCode: 61 })));

    expect(block).toBe(
      [
        "  Clima:       Lluvia ligera",
        "  Temperatura: 21.5°C",
        "  Humedad:     60%",
        "  Viento:      12.3 km/h",
      ].join("\n"),
    );
  });
});