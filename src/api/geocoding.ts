import type { City } from "../types/City.ts";
import { fetchJson } from "./http.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
// Suficientes para desambiguar nombres muy repetidos (Springfield, Mexico) sin
// desbordar una terminal de 80 columnas.
const GEOCODING_RESULTS = 5;

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface GeocodingResponse {
  // La API omite el campo por completo cuando no hay coincidencias.
  results?: GeocodingResult[];
}

// Devuelve todas las coincidencias; elegir cuál se guarda es trabajo de la UI.
export async function searchCities(query: string): Promise<City[]> {
  const params = new URLSearchParams({
    name: query,
    count: String(GEOCODING_RESULTS),
    language: "es",
    format: "json",
  });
  const data = await fetchJson<GeocodingResponse>(`${GEOCODING_URL}?${params}`);

  return (data.results ?? []).map((result) => ({
    id: result.id,
    name: result.name,
    region: result.admin1 ?? null,
    country: result.country ?? null,
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}
