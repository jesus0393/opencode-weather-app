import { describe, expect, test } from "bun:test";
import { describeWeatherCode } from "../../src/utils/weatherCodes.ts";

describe("describeWeatherCode", () => {
  test("describe los códigos que usa la app", () => {
    expect(describeWeatherCode(0)).toBe("Despejado");
    expect(describeWeatherCode(3)).toBe("Nublado");
    expect(describeWeatherCode(45)).toBe("Niebla");
    expect(describeWeatherCode(61)).toBe("Lluvia ligera");
    expect(describeWeatherCode(75)).toBe("Nevada intensa");
    expect(describeWeatherCode(82)).toBe("Chubascos violentos");
    expect(describeWeatherCode(95)).toBe("Tormenta");
    expect(describeWeatherCode(99)).toBe("Tormenta con granizo fuerte");
  });

  test("un código desconocido no lanza", () => {
    expect(describeWeatherCode(123)).toBe("Desconocido");
  });
});