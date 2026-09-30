// La identidad de una ciudad es su `id` de GeoNames, no su posición: así el
// default sobrevive a reordenamientos y eliminaciones.
export interface City {
  id: number;
  name: string;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
}
