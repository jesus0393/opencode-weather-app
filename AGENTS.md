# Weather CLI

App de consola en Bun.js que consulta clima con OpenMeteo. Objetivo final: binario compilado.
Documentación funcional (menú esperado, endpoints) en `README.md` (en español).

## Comandos

```bash
bun run start              # ejecutar
bun run dev                # ejecutar con recarga automática
bun run build              # binario
bunx tsc --noEmit          # typecheck (única verificación automática)
```

Smoke test sin terminal (stdin pipeado):

```bash
printf '1\n9\n' | bun run start               # clima de la ciudad default y salir
printf '2\n9\n' | FORCE_COLOR=1 bun run start # forzar los colores con la salida pipeada
```

Las variables de entorno van antes de `bun`, no antes de `printf`.

## Arquitectura

| Archivo | Responsabilidad |
| --- | --- |
| `index.ts` | Loop del menú: pide opción, busca en `ACTIONS` y llama a `saveConfig` si la acción devuelve un `Config` nuevo. |
| `src/ui/actions.ts` | `ACTIONS: Record<string, Action>`. `Action = ({ config, ask }) => Promise<Config \| null>`: devolver `Config` dispara el guardado, `null` significa "nada que persistir". |
| `src/ui/console.ts` | Prompter + impresión (`printError` → stderr; `printWarn` / `printSuccess` → stdout). |
| `src/ui/format.ts` | Formatters de texto: alineación de tablas, etiquetas de ciudad (corta y detallada), unidades. Sin I/O. |
| `src/ui/colors.ts` | Primitivas ANSI (`bold`, `dim`, `red`, `green`, `yellow`, `cyan`). |
| `src/api/openMeteo.ts` | `fetch` directo a la API + tipos de respuesta. |
| `src/api/weatherCodes.ts` | Código WMO → descripción en español. |
| `src/services/cityService.ts` | Operaciones puras sobre `Config` (sin I/O). |
| `src/services/configStore.ts` | Lee y escribe `~/.config/weather-cli/config.json`. |

Flujo: `index.ts` → `ACTIONS[opción]` → `api/*` (red) y `services/cityService` (estado) → `configStore.saveConfig`.

## Invariantes y trampas

- **Colorear después del relleno.** `formatWeatherRow` y `formatWeatherBlock` calculan `padStart`/`padEnd` sobre texto plano y aplican el color después: los escapes ANSI cuentan como caracteres y desalinearían la tabla. Los anchos se miden siempre sobre texto plano.
- **No usar `reader.question()`.** El prompter de `console.ts` gestiona las líneas a mano porque con stdin como pipe llegan todas de golpe y el evento `close` se dispararía antes de que el usuario contestara, cerrando el menú de forma prematura.
- **`ask` devuelve `null` cuando stdin cerró** (Ctrl+D / Ctrl+C o pipe agotado). Toda acción debe manejar ese caso y salir sin escribir en el config.
- **La identidad de una ciudad es su `id` de GeoNames**, no su posición: así el default sobrevive a reordenamientos y eliminaciones.
- **Dos etiquetas de ciudad para dos contextos.** `formatCityLabel` es la corta y va en las tablas de clima, donde `MAX_LABEL_WIDTH` (40) la trunca; `formatCityChoice` le añade las coordenadas y es la de los selectores numerados. El geocoding devuelve lugares distintos con etiqueta idéntica ("Morelia, Estado de Chiapas, México" sale 3 veces), así que sin coordenadas el usuario no puede elegir. No unifiques las dos.
- **La desambiguación solo pregunta si hace falta:** con una coincidencia disponible se agrega directo, y las ya guardadas se filtran antes de mostrar la lista.
- **El config es editable a mano.** `parseConfig` valida cada campo y cae al config de fábrica si algo no cuadra; un archivo corrupto no debe impedir arrancar.
- **Colores:** se desactivan si `stdout` no es TTY; `NO_COLOR` los desactiva siempre y `FORCE_COLOR` los fuerza.
- **Toda petición a OpenMeteo lleva timeout de 10 s** (`AbortSignal.timeout`) para que una conexión estancada no cuelgue el menú.
- Fluent de API en inglés, valores/etiquetas de clima en español (`language=es`). Los mensajes al usuario, siempre en español.

## API (sin SDK, `fetch` directo)

1. Geocoding → lat/lon:
   `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5&language=es&format=json`
   `searchCities` devuelve **todas** las coincidencias (`City[]`), sin resultados → `[]`. Traducir/desambiguar es trabajo de la UI, no de la API. De cada resultado se usan `id`, `name`, `admin1` (→ `region`), `country`, `latitude`, `longitude`.
2. Clima actual:
   `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit={celsius|fahrenheit}&timezone=auto`
   Además de `current`, se leen `current_units` y `timezone_abbreviation`.

## Menú

Numeración real definida en `ACTIONS` (`src/ui/actions.ts:174`):

| Opción | Acción | Red |
| --- | --- | --- |
| 1 | Clima de ciudad default | sí |
| 2 | Clima de todas las ciudades (`Promise.allSettled`: una ciudad con error no impide ver las demás) | sí |
| 3 | Buscar y agregar ciudad | sí |
| 4 | Eliminar ciudad | no |
| 5 | Establecer ciudad default | no |
| 8 | Ajustes (toggle de unidad) | no |
| 9 | Salir | no |

Ojo: la numeración salta de 5 a 8 — viene del `README.md`, no es un bug a arreglar sin confirmar.

## Restricciones del repo

- **Bun, no Node.** No uses `npm run`: los scripts de `package.json` están pensados para `bun run`.
- **TypeScript 7** como peer dep (`typescript@^7`, binario nativo en `@typescript/typescript-linux-x64`).
- **No hay framework de test, linter ni formatter configurados.** No inventes comandos de test/lint; verifica con `bunx tsc --noEmit`.
- `tsconfig.json`: `noUncheckedIndexedAccess: true` → el acceso a índices/records devuelve `T | undefined`. Manéjalo explícitamente.
- `verbatimModuleSyntax: true` → los type-only imports requieren `import type { X }`.
- `allowImportingTsExtensions: true` → los imports entre archivos locales llevan extensión `.ts`.

## Issues conocidos

- **Sin tests.** La verificación es manual: typecheck + smoke con stdin pipeado.
- **Geocoding limitado a 5 resultados y sin paginación:** "Paris" o "London" dejan más de 5 coincidencias que no se pueden ver. Además no hay filtro por país (`countryCode`), así que al buscar un nombre común toca leer las coordenadas para ubicar el lugar.
- **Coordenadas, no población:** el selector muestra `(lat, lon)` para distinguir candidatos. Es lo que consume la API del clima, pero un usuario novel tiene que reconocer la ubicación por coordenadas.
- **EPIPE:** escribir en stdout después de que el lector se fue (p. ej. `./weather | head`) lanza una excepción no manejada.
- `configLocation()` está exportada en `configStore.ts` pero nadie la usa.

## Verificación

1. `bunx tsc --noEmit` — obligatorio, única verificación automática.
2. `printf '1\n9\n' | bun run start` — clima default y salida limpia.
3. `printf '2\n9\n' | FORCE_COLOR=1 ./weather | cat -v` para ver los escapes de la app; con `NO_COLOR=1` deben ser 0. Usa el binario y no `bun run`, que colorea su propio banner y ensucia el conteo.
4. `printf '3\nspringfield\n2\n9\n' | bun run start` — lista candidatos con coordenadas y guarda el elegido. Repite con `morelia` (hay 3 con la misma etiqueta) y con `zihuatanejo` (match único: no debe preguntar nada).
5. `bun run build` y probar `./weather`.
