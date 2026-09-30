export const NO_CITIES_MESSAGE = "No hay ciudades guardadas. Usa la opción 3 para agregar una.";

export function describeCities(total: number): string {
  return total === 1 ? "1 ciudad" : `${total} ciudades`;
}
