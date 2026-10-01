import { describe, expect, test } from "bun:test";
import { showAllForecast } from "../../src/actions/getAllForecast.ts";
import { showAllWeather } from "../../src/actions/getAllWeather.ts";
import { showDefaultForecast } from "../../src/actions/getForecast.ts";
import { showDefaultWeather } from "../../src/actions/getWeather.ts";
import { currentWeatherResponse, dailyForecastResponse } from "../helpers/apiResponses.ts";
import { city, configWithCities } from "../helpers/factories.ts";
import { jsonResponse, stubFetch } from "../helpers/fetchStub.ts";
import { stripAnsi } from "../helpers/colors.ts";
import { captureConsole } from "../setup.ts";

const ottawa = city({ id: 123, name: "Ottawa" });
const zurich = city({ id: 456, name: "Zurich", region: null, country: "Suiza" });
const NO_CITIES = "No hay ciudades guardadas";

describe("showDefaultWeather", () => {
  test("muestra el clima de la ciudad default", async () => {
    const captured = captureConsole();
    stubFetch(jsonResponse(currentWeatherResponse()));

    await showDefaultWeather({ config: configWithCities([ottawa, zurich]), ask: async () => null });

    expect(captured.text()).toContain("Temperatura:");
    expect(captured.text()).toContain("21.5°C");
  });

  test("sin ciudades avisa y no consulta la red", async () => {
    const captured = captureConsole();
    const stub = stubFetch(jsonResponse(currentWeatherResponse()));

    await showDefaultWeather({ config: configWithCities([]), ask: async () => null });

    expect(captured.text()).toContain(NO_CITIES);
    expect(stub.urls).toEqual([]);
  });
});

describe("showAllWeather", () => {
  test("una fila por ciudad", async () => {
    const captured = captureConsole();
    // Una sola respuesta encolada: al agotarse la cola el stub repite la última, así
    // que las tres ciudades se resuelven sin tener que encolar tres cuerpos.
    stubFetch(jsonResponse(currentWeatherResponse()));

    await showAllWeather({ config: configWithCities([ottawa, zurich, city({ id: 789, name: "Morelia" })]), ask: async () => null });

    const text = stripAnsi(captured.text());
    expect(text).toContain("Ottawa, Ontario, Canadá");
    expect(text).toContain("Zurich, Suiza");
    expect(text).toContain("Morelia");
    // Ninguna ciudad quedó con el error del body ya leído.
    expect(text).not.toContain("Body already used");
  });

  test("una ciudad con error no impide ver las demás", async () => {
    const captured = captureConsole();
    stubFetch(
      jsonResponse({}, 400),
      jsonResponse(currentWeatherResponse()),
      jsonResponse(currentWeatherResponse()),
    );

    await showAllWeather({ config: configWithCities([ottawa, zurich, city({ id: 789, name: "Morelia" })]), ask: async () => null });

    const text = stripAnsi(captured.text());
    expect(text).toContain("OpenMeteo respondió 400");
    expect(text).toContain("21.5°C");
  });

  test("sin ciudades avisa y no consulta la red", async () => {
    const captured = captureConsole();
    const stub = stubFetch(jsonResponse(currentWeatherResponse()));

    await showAllWeather({ config: configWithCities([]), ask: async () => null });

    expect(captured.text()).toContain(NO_CITIES);
    expect(stub.urls).toEqual([]);
  });
});

describe("showDefaultForecast", () => {
  test("muestra el pronóstico de la ciudad default", async () => {
    const captured = captureConsole();
    stubFetch(jsonResponse(dailyForecastResponse()));

    await showDefaultForecast({ config: configWithCities([ottawa]), ask: async () => null });

    const text = stripAnsi(captured.text());
    expect(text).toContain("(hoy)");
    expect(text).toContain("9 – 19 °C");
  });

  test("sin ciudades avisa y no consulta la red", async () => {
    const captured = captureConsole();
    const stub = stubFetch(jsonResponse(dailyForecastResponse()));

    await showDefaultForecast({ config: configWithCities([]), ask: async () => null });

    expect(captured.text()).toContain(NO_CITIES);
    expect(stub.urls).toEqual([]);
  });
});

describe("showAllForecast", () => {
  test("una tabla por ciudad", async () => {
    const captured = captureConsole();
    stubFetch(jsonResponse(dailyForecastResponse()));

    await showAllForecast({ config: configWithCities([ottawa, zurich]), ask: async () => null });

    const text = stripAnsi(captured.text());
    expect(text).toContain("Ottawa, Ontario, Canadá");
    expect(text).toContain("Zurich, Suiza");
    expect(text).not.toContain("Body already used");
  });

  test("una ciudad con error no impide ver las demás", async () => {
    const captured = captureConsole();
    stubFetch(jsonResponse({}, 400), jsonResponse(dailyForecastResponse()));

    await showAllForecast({ config: configWithCities([ottawa, zurich]), ask: async () => null });

    const text = stripAnsi(captured.text());
    expect(text).toContain("OpenMeteo respondió 400");
    expect(text).toContain("Zurich, Suiza");
  });

  test("sin ciudades avisa y no consulta la red", async () => {
    const captured = captureConsole();
    const stub = stubFetch(jsonResponse(dailyForecastResponse()));

    await showAllForecast({ config: configWithCities([]), ask: async () => null });

    expect(captured.text()).toContain(NO_CITIES);
    expect(stub.urls).toEqual([]);
  });
});
