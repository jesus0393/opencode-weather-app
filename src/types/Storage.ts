// El guardado no lanza, igual que la carga: devuelve el motivo para que el loop
// lo muestre y decida no confirmar el cambio.
export type SaveResult = { ok: true } | { ok: false; reason: string };

// Qué archivo de storage hay que escribir. Por construcción cada acción toca
// exactamente uno: las de ciudades escriben también `defaultCityId`, que vive en
// `cities.json` junto a ellas.
export type ChangedSlice = "cities" | "unit";
