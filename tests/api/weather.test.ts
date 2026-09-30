import { describe, expect, test } from "bun:test";
import { getCurrentWeather, getDailyForecast } from "../../src/api/weather.ts";
import { jsonResponse, paramsOf, stubFetch } from "../helpers/fetchStub.ts";
import { city } from "../helpers/factories.ts";

const ottawa = city({ id: 123, name: "Ottawa", latitude: 45.42, longitude: -75.7 });

const CURRENT_BODY = {
  timezone_abbreviation: "-04",
  current_units: { temperature_2m: "°C", relative_humidity_2m: "%", wind_speed_10m: "km/h" },
  current: { temperature_2m: 21.5, relative_humidity_2m: 60, weather_code: 3, wind_speed_10m: 12.3 },
};

const DAILY_BODY = {
  timezone_abbreviation: "-04",
  daily_units: {
    temperature_2m_max: "°C",
    wind_speed_10m_max: "km/h",
    precipitation_probability_max: "%",
  },
  daily: {
    time: ["2026-09-30", "2026-10-01"],
    weather_code: [0, 61],
    temperature_2m_max: [19.2, 17.4],
    temperature_2m_min: [9.4, 8.1],
    precipitation_probability_max: [10, 80],
    wind_speed_10m_max: [14.1, 22.6],
  },
};

describe("getCurrentWeather", () => {
  test("mapea current y sus unidades", async () => {
    stubFetch(jsonResponse(CURRENT_BODY));

    expect(await getCurrentWeather(ottawa, "celsius")).toEqual({
      temperature: 21.5,
      humidity: 60,
      weatherCode: 3,
      windSpeed: 12.3,
      timeZoneAbbreviation: "-04",
      units: { temperature: "°C", humidity: "%", windSpeed: "km/h" },
    });
  });

  test("la unidad de la consulta decide la de la respuesta", async () => {
    const stub = stubFetch(
      jsonResponse({
        ...CURRENT_BODY,
        current_units: { ...CURRENT_BODY.current_units, temperature_2m: "°F" },
        current: { ...CURRENT_BODY.current, temperature_2m: 70.7 },
      }),
    );

    const weather = await getCurrentWeather(ottawa, "fahrenheit");

    expect(paramsOf(stub.urls[0] ?? "").get("temperature_unit")).toBe("fahrenheit");
    expect(weather.temperature).toBe(70.7);
    expect(weather.units.temperature).toBe("°F");
  });

  test("la URL lleva ubicación, zona horaria y los campos de current", async () => {
    const stub = stubFetch(jsonResponse(CURRENT_BODY));
    await getCurrentWeather(ottawa, "celsius");

    const url = stub.urls[0] ?? "";
    expect(url.startsWith("https://api.open-meteo.com/v1/forecast?")).toBe(true);

    const params = paramsOf(url);
    expect(params.get("latitude")).toBe("45.42");
    expect(params.get("longitude")).toBe("-75.7");
    expect(params.get("timezone")).toBe("auto");
    expect(params.get("current")).toBe(
      "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
    );
  });
});

describe("getDailyForecast", () => {
  test("aplana los arrays paralelos en días", async () => {
    stubFetch(jsonResponse(DAILY_BODY));

    expect(await getDailyForecast(ottawa, "celsius")).toEqual({
      days: [
        {
          date: "2026-09-30",
          weatherCode: 0,
          minTemperature: 9.4,
          maxTemperature: 19.2,
          precipitationProbability: 10,
          windSpeed: 14.1,
        },
        {
          date: "2026-10-01",
          weatherCode: 61,
          minTemperature: 8.1,
          maxTemperature: 17.4,
          precipitationProbability: 80,
          windSpeed: 22.6,
        },
      ],
      timeZoneAbbreviation: "-04",
      units: { temperature: "°C", windSpeed: "km/h", precipitationProbability: "%" },
    });
  });

  test("un día sin temperatura, viento o código se omite en vez de rellenarse con ceros", async () => {
    stubFetch(
      jsonResponse({
        ...DAILY_BODY,
        daily: {
          ...DAILY_BODY.daily,
          weather_code: [0, null],
          temperature_2m_max: [19.2, null],
        },
      }),
    );

    const forecast = await getDailyForecast(ottawa, "celsius");

    // El índice 1 se pierde, pero el 0 conserva su lugar.
    expect(forecast.days.map((day) => day.date)).toEqual(["2026-09-30"]);
  });

  test("una probabilidad ausente se conserva como null, no como 0", async () => {
    stubFetch(
      jsonResponse({
        ...DAILY_BODY,
        daily: { ...DAILY_BODY.daily, precipitation_probability_max: [null, 80] },
      }),
    );

    const forecast = await getDailyForecast(ottawa, "celsius");

    expect(forecast.days[0]?.precipitationProbability).toBeNull();
    expect(forecast.days[1]?.precipitationProbability).toBe(80);
  });

  test("los arrays más cortos no desalinean los días", async () => {
    stubFetch(
      jsonResponse({
        ...DAILY_BODY,
        // La API siempre manda arrays del mismo largo; si no, el índice se pierde.
        daily: { ...DAILY_BODY.daily, temperature_2m_max: [19.2] },
      }),
    );

    const forecast = await getDailyForecast(ottawa, "celsius");

    expect(forecast.days.map((day) => day.date)).toEqual(["2026-09-30"]);
  });

  test("la URL pide 7 días y los campos diarios", async () => {
    const stub = stubFetch(jsonResponse(DAILY_BODY));
    await getDailyForecast(ottawa, "fahrenheit");

    const params = paramsOf(stub.urls[0] ?? "");
    expect(params.get("forecast_days")).toBe("7");
    expect(params.get("temperature_unit")).toBe("fahrenheit");
    expect(params.get("timezone")).toBe("auto");
    expect(params.get("daily")).toBe(
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
    );
    // current no se pide en el pronóstico: son dos endpoints distintos.
    expect(params.get("current")).toBeNull();
  });
});