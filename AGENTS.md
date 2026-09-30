# Weather CLI

App de consola en Bun.js que consulta clima con OpenMeteo. Objetivo final: binario compilado.
Documentación funcional (menú esperado, endpoints) en `README.md` (en español).

## Comandos

```bash
bun run start              # ejecutar
bun run dev                # ejecutar con recarga automática
bun run build              # binario
bun run test               # tests (bun test, sin dependencias)
bun run typecheck          # typecheck
```

Smoke test sin terminal (stdin pipeado):

```bash
printf '1\n9\n' | bun run start               # clima de la ciudad default y salir
printf '2\n9\n' | FORCE_COLOR=1 bun run start # forzar los colores con la salida pipeada
```

Las variables de entorno van antes de `bun`, no antes de `printf`.

## Arquitectura

Capas, de fuera hacia dentro. `types/` es una hoja: no importa nada del resto.

| Archivo | Responsabilidad |
| --- | --- |
| `src/index.ts` | Loop del menú: pide opción, busca en `MENU`, guarda y solo entonces confirma. |
| `src/types/` | Contratos sin implementación: `City`, `Config`/`Unit`, `Weather`/`ForecastDay`, `MenuOption`/`Action`/`AppContext`/`ActionOutcome`, `Prompter`, `SaveResult`/`ChangedSlice`. |
| `src/actions/` | Un archivo por opción del menú, más `cityPicker.ts` (lista numerada compartida) y `messages.ts`. Una acción devuelve `ActionOutcome \| null`; `null` = "nada que persistir". |
| `src/presentation/` | `menu.ts` (`MENU: readonly MenuOption[]` + `EXIT_OPTION` + `printMenu`; el registro **es** el menú), `input.ts` (prompter + `askIndex`), `output.ts` (printers), `loading.ts` (`withLoading`). |
| `src/storage/` | `cities.json` + `settings.json`, el agregador `config.ts` (`loadConfig`, `persist`) y el plumero de I/O `jsonFile.ts`. |
| `src/domain/` | Operaciones puras sobre `Config` (sin I/O). |
| `src/api/` | `fetch` directo a OpenMeteo: `http.ts` (timeout), `geocoding.ts`, `weather.ts`. |
| `src/utils/` | Formatters de texto (`format.ts`), `colors.ts` (ANSI), `weatherCodes.ts` (código WMO), `errors.ts`. Sin I/O. |
| `tests/` | Refleja `src/`: `domain/`, `storage/`, `api/`, `utils/`, `presentation/`, `actions/`, más `helpers/` y `setup.ts` (preload). No es código de producción. |

Flujo: `src/index.ts` → `MENU[opción].run` → `api/*` (red) y `domain/config` (estado) → `storage/config.persist`.

## Storage en dos archivos

`~/.config/weather-cli/cities.json` = `{ cities, defaultCityId }` y `settings.json` = `{ unit }`. Antes era un `config.json` único; `storage/config.ts` migra el legacy en el arranque y lo borra solo cuando ambas piezas están escritas.

- **`defaultCityId` va en `cities.json`, no en `settings.json`.** Por construcción cada acción escribe **un** archivo: las de ciudades escriben sus dos datos juntos. Si el default viviera en el otro archivo, borrar la ciudad default sería la única operación que tocaría los dos y habría que resolver una transacción de dos escrituras que ahora no existe. **No lo muevas sin traer esa consecuencia.**
- **`ChangedSlice` va en el `ActionOutcome`.** La acción declara qué cambió (`"cities"` | `"unit"`) y el loop guarda solo ese archivo. Acertar el literal importa: si `addCity.ts` dijera `"unit"`, el loop confirmaría "agregada" y guardaría el archivo equivocado, dejando memoria y disco divergentes.
- **La migración nunca sobreescribe un archivo que ya existe.** Si una migración quedó a medias (escribió `cities.json` y no `settings.json`) y el usuario ya guardó un cambio, ese archivo es la versión más nueva.
- **Un legacy ilegible no se borra.** Si `config.json` no es un objeto con la forma esperada, se deja ahí como evidencia y la app arranca con los archivos nuevos (o vacíos), como antes.


## Invariantes y trampas

- **El menú se declara en un solo lugar.** Número, etiqueta y acción viven en la misma entrada de `MENU` (`src/presentation/menu.ts`), y `printMenu` deriva de ahí. Antes el menú se imprimía en `console.ts` y las acciones se registraban aparte en `actions.ts`, dos listas que ningún tipo unía: olvidar una era un bug invisible hasta runtime (opción que nunca se ofrece, o "Opción inválida"). **Añadir una opción = una entrada en `MENU` + su archivo en `actions/`**, nada más. No reintroduzcas un `printMenu` con literales ni un registro de acciones aparte.
- **`label` es una función, no un string**, porque algunas entradas dependen del config (el conteo de ciudades, la unidad vigente). Y `EXIT_OPTION` no es un `MenuOption`: la resuelve `src/index.ts` antes de buscar en `MENU`.
- **Colorear después del relleno.** `formatTable` mide el ancho de cada columna sobre `cell.text` (texto plano) y aplica el color al final, sobre el texto ya rellenado: los escapes ANSI cuentan como caracteres y desalinearían la tabla. Por eso `Cell` lleva el texto plano y el color por separado, y las celdas nunca traen escapes dentro de `text`. La última columna no se rellena (espacios finales). Cuando añadas una tabla, pasa celdas a `formatTable`, no stringeis formateados a mano.
- **Las fechas del pronóstico son fechas civiles.** `daily.time` trae `"2026-09-30"`, el día *de la ciudad*, no un instante. `formatDayLabel` lo formatea con `Intl` y `timeZone: "UTC"` a propósito: `new Date("2026-09-30")` en hora local la correría un día hacia atrás en cualquier ciudad con UTC negativo.
- **No usar `reader.question()`.** El prompter de `presentation/input.ts` gestiona las líneas a mano porque con stdin como pipe llegan todas de golpe y el evento `close` se dispararía antes de que el usuario contestara, cerrando el menú de forma prematura.
- **Ninguna acción imprime su propia confirmación.** Una acción devuelve `{ config, changed, message }` y quien confirma es el loop, ya guardado. Un `printSuccess` dentro de la acción miente cuando el write falla (permisos, disco lleno, `~/.config` montado en solo-lectura): el usuario ve "agregada" y no se guardó nada. Los `printWarn` sí van dentro de la acción, porque son avisos recuperables que no implican escritura.
- **`persist` no lanza**, igual que `loadConfig` no lanza: devuelve `{ ok: false, reason }` para que el loop muestre el motivo. Por eso `src/index.ts` asigna `config = outcome.config` *después* del guardado; si no, el config en memoria y el disco divergirían.
- **`ask` devuelve `null` cuando stdin cerró** (Ctrl+D / Ctrl+C o pipe agotado). Toda acción debe manejar ese caso y salir sin escribir en el config.
- **La identidad de una ciudad es su `id` de GeoNames**, no su posición: así el default sobrevive a reordenamientos y eliminaciones.
- **Dos etiquetas de ciudad para dos contextos.** `formatCityLabel` es la corta y va en las tablas de clima, donde `MAX_LABEL_WIDTH` (40) la trunca; `formatCityChoice` le añade las coordenadas y es la de los selectores numerados. El geocoding devuelve lugares distintos con etiqueta idéntica ("Morelia, Estado de Chiapas, México" sale 3 veces), así que sin coordenadas el usuario no puede elegir. No unifiques las dos.
- **La desambiguación solo pregunta si hace falta:** con una coincidencia disponible se agrega directo, y las ya guardadas se filtran antes de mostrar la lista.
- **El config es editable a mano.** `parseCities` y `parseUnit` validan cada campo y caen a la lista vacía / a Celsius si algo no cuadra; un archivo corrupto no debe impedir arrancar.
- **Colores:** se desactivan si `stdout` no es TTY; `NO_COLOR` los desactiva siempre y `FORCE_COLOR` los fuerza.
- **Toda petición a OpenMeteo lleva timeout de 10 s** (`AbortSignal.timeout`) para que una conexión estancada no cuelgue el menú. Con red que no falla (firewall DROP, VPN caída, captive portal) el usuario se queda **10 s mirando la pantalla quieta**; por eso los segundos del spinner no son adorno, son lo que distingue "esperando" de "colgado".
- **Toda llamada de red va envuelta en `withLoading`.** No pongas el spinner dentro de `fetchJson`: `showAllWeather` lanza N peticiones en paralelo y se pelearían por la línea, y `api/` no debe importar de `presentation/`. Envuelve el `Promise.allSettled` **completo**, no cada fetch. Si añades un endpoint, envuélvelo tú.
- **`withLoading` solo anima con TTY** (`process.stdout.isTTY === true`), igual que los colores: con stdout pipeado o redirigido no escribe nada, y por eso los smoke tests de abajo, que grepean stdout, siguen funcionando. El primer frame espera 200 ms, así que una respuesta rápida no produce parpadeo, y la línea se borra en `finally` con el ancho real de lo escrito.
- Fluent de API en inglés, valores/etiquetas de clima en español (`language=es`). Los mensajes al usuario, siempre en español.

## API (sin SDK, `fetch` directo)

1. Geocoding → lat/lon:
   `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5&language=es&format=json`
   `searchCities` devuelve **todas** las coincidencias (`City[]`), sin resultados → `[]`. Traducir/desambiguar es trabajo de la UI, no de la API. De cada resultado se usan `id`, `name`, `admin1` (→ `region`), `country`, `latitude`, `longitude`.
2. Clima actual:
   `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit={celsius|fahrenheit}&timezone=auto`
   Además de `current`, se leen `current_units` y `timezone_abbreviation`.
3. Pronóstico diario:
   mismo endpoint con `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&forecast_days=7`
   `daily` son **arrays paralelos** (el índice `i` de cada uno es el mismo día) y `daily_units` trae las unidades. `zipDays` los aplana a `ForecastDay[]`; las unidades de temperatura y viento son las de `daily_units`, la de precipitación viene suelta en la celda.
   - `daily` puede venir con `null` en los valores que el modelo no calculó: `precipitationProbability` es `number | null` y se muestra `—`, nunca un 0 %. Un día al que le falte temperatura, viento o código se **omite** de la tabla en vez de rellenarse con ceros, que el usuario leería como datos reales.
   - `locationParams` factoriza el bloque `latitude`/`longitude`/`temperature_unit`/`timezone` que comparten los dos endpoints del pronóstico. Si un tercer endpoint repite ese bloque, es el lugar donde entra.
   - Respuestas separadas (`CurrentWeatherResponse`, `DailyForecastResponse`): la mezcla de `current` y `daily` en un tipo único ya no tiene sentido.

## Menú

Numeración real definida en `MENU` (`src/presentation/menu.ts`):

| Opción | Acción | Red | Archivo |
| --- | --- | --- | --- |
| 1 | Clima de ciudad default | sí | `actions/getWeather.ts` |
| 2 | Clima de todas las ciudades (`Promise.allSettled`: una ciudad con error no impide ver las demás) | sí | `actions/getAllWeather.ts` |
| 3 | Buscar y agregar ciudad | sí | `actions/addCity.ts` |
| 4 | Eliminar ciudad | no | `actions/removeCity.ts` |
| 5 | Establecer ciudad default | no | `actions/setDefaultCity.ts` |
| 6 | Pronóstico de 7 días (ciudad default) | sí | `actions/getForecast.ts` |
| 7 | Pronóstico de 7 días de todas (`Promise.allSettled`, una tabla por ciudad: una con coordenadas inválidas no impide ver las demás) | sí | `actions/getAllForecast.ts` |
| 8 | Ajustes (toggle de unidad) | no | `actions/adjustSettings.ts` |
| 9 | Salir | no | — |

Los saltos de número vienen del `README.md`, no son un bug a arreglar sin confirmar: 6 y 7 se añadieron para el pronóstico y ocuparon el hueco que había entre 5 y 8.

## Restricciones del repo

- **Bun, no Node.** No uses `npm run`: los scripts de `package.json` están pensados para `bun run`.
- **Tests con `bun test`, sin dependencias.** Cada archivo `*.test.ts` importa de `bun:test`. El typecheck los cubre: `tsconfig.json` tiene `types: ["bun"]`, así que un test mal tipado falla en `bun run typecheck` aunque `bun test` lo ejecute.
- **TypeScript 7** como peer dep (`typescript@^7`, binario nativo en `@typescript/typescript-linux-x64`).
- **No hay linter ni formatter configurados.** No inventes comandos de lint; verifica con `bun run typecheck` y `bun run test`.
- `tsconfig.json`: `noUncheckedIndexedAccess: true` → el acceso a índices/records devuelve `T | undefined`. Manéjalo explícitamente.
- `verbatimModuleSyntax: true` → los type-only imports requieren `import type { X }`.
- `allowImportingTsExtensions: true` → los imports entre archivos locales llevan extensión `.ts`.

## Tests

`bun run test` (`bun test`, sin dependencias). 133 tests que reflejan `src/`.

**Nada de red real.** `api/` se prueba con `globalThis.fetch` stubbeado (`tests/helpers/fetchStub.ts`), y las acciones que consultan el geocoding también. Una prueba que dependiera de OpenMeteo sería intermitente: la red lenta es un bug de la app, no un motivo para que el test pase.

**El storage en disco va en subproceso.** `os.homedir()` se cachea al arrancar en Bun, así que cambiar `process.env.HOME` dentro del test no mueve las rutas de `cities.json` / `settings.json`. La única forma de darle un HOME de verdad es arrancar otro proceso: `tests/helpers/runApp.ts` lanza `bun run src/index.ts` con un `HOME` de `mkdtemp` y las líneas de stdin que el usuario respondería. Cubre la migración del legacy, el `persist` por slice y el write fallido, sin variables de test en producción.

**Las pruebas de disco evitan las opciones con red.** Usan 4, 5 y 8 (no 3, la que llama al geocoding): el objetivo es el disco, y colgar 10 s por timeout haría la suite lenta y frágil.

**La instrumentación global vive en `tests/setup.ts`,** no en un helper importado: los hooks de un módulo importado no alcanzan a los tests declarados en otro archivo. Ahí viven los spies de `console` (los printers y `pickCity` escriben con `console.log`, y sin silenciarlos cada prueba de acciones inunda la salida del runner) y el reset de `NO_COLOR`.

**Los asserts de texto plano son explícitos.** `formatCityChoice` y compañía aplican color, así que los tests que comparan texto llaman a `plainColors()` o comparan con `stripAnsi`. El modo forzado se prueba en `tests/utils/colors.test.ts`.

**Los helpers son de `tests/helpers/`:** `factories.ts` (ciudades, config, clima, prompter guionizado), `fetchStub.ts`, `colors.ts`, `runApp.ts`.

## Issues conocidos

- **`mkdtemp` deja directorios en `/tmp`:** una prueba crea su HOME y solo lo borra al terminar; si el proceso muere a mitad, el directorio queda. Es el precio de no meter rutas de test en producción.
- **Escritura no atómica:** `writeJson` hace `writeFile` directo sobre el archivo. Un corte a media escritura lo deja truncado y `readJson` lo descarta en silencio en la siguiente corrida. Lo correto sería escribir a `.tmp` y `rename`.
- **Un config ilegible se pierde sin avisar:** `readJson` devuelve `undefined` y `loadCities`/`loadUnit` caen a lista vacía / Celsius. El archivo roto sigue ahí (no se sobrescribe hasta que la app guarde algo) y el usuario ve la lista vacía sin explicación. La migración se comporta igual a propósito: un legacy ilegible no se borra. Además, hacer el *directorio* read-only no impide guardar: solo hay que quitarle permiso de escritura al archivo.
- **No se respeta `XDG_CONFIG_HOME`:** las rutas son `~/.config/weather-cli/cities.json` y `settings.json`, fijas. Cambiarlas obligaría a migrar los archivos existentes.
- **`homedir()` sin `HOME` en el entorno** cae al passwd entry (Bun lo resuelve así), no a `/root` ni al cwd. No es un bug, pero conviene saberlo antes de "arreglarlo".
- **Geocoding limitado a 5 resultados y sin paginación:** "Paris" o "London" dejan más de 5 coincidencias que no se pueden ver. Además no hay filtro por país (`countryCode`), así que al buscar un nombre común toca leer las coordenadas para ubicar el lugar.
- **Coordenadas, no población:** el selector muestra `(lat, lon)` para distinguir candidatos. Es lo que consume la API del clima, pero un usuario novel tiene que reconocer la ubicación por coordenadas.
- **EPIPE:** escribir en stdout después de que el lector se fue (p. ej. `./weather | head`) lanza una excepción no manejada. Con el spinner es más fácil de pegarle: escribe ~12 veces por segundo, así que el fallo salta en medio de la animación y no al imprimir el menú. El arreglo (escuchar `error` en `process.stdout`) es ortogonal a la carga.
- **Dos archivos para una app que casi siempre escribe uno:** el split por entidad se pagó por adelantado, no por una necesidad actual. Si `cities.json` y `settings.json` no divergen nunca, un archivo único y `persist(config)` eran más simples. La red de seguridad es que volver atrás es el mismo camino de `storage/config.ts`, al revés.
- **La migración se mira en cada arranque:** lee el legacy y hace dos `stat` sobre los archivos nuevos. Con el legacy ya borrado son dos `stat` de más por corrida, despreciables.
- **`ChangedSlice` es un literal, no un tipo cerrado a la acción:** una acción puede mentir sobre qué cambió y el loop lo creería. Lo cubre la regresión del guardado (verificación 5), no el typecheck.

## Verificación

1. `bun run typecheck` y `bun run test` — obligatorio, automático.
2. `printf '1\n9\n' | bun run start` — clima default y salida limpia.
3. `printf '2\n9\n' | FORCE_COLOR=1 ./weather | cat -v` para ver los escapes de la app; con `NO_COLOR=1` deben ser 0. Usa el binario y no `bun run`, que colorea su propio banner y ensucia el conteo.
4. `printf '3\nspringfield\n2\n9\n' | bun run start` — lista candidatos con coordenadas y guarda el elegido. Repite con `morelia` (hay 3 con la misma etiqueta) y con `zihuatanejo` (match único: no debe preguntar nada).
5. **Regresión del guardado:** automatizado en `tests/storage/persistence.test.ts` (write fallido, `cities.json` read-only, sin mensaje de confirmación). Ver a mano:
   ```bash
   mkdir -p /tmp/wtest && printf '3\nzihuatanejo\n9\n' | HOME=/tmp/wtest ./weather
   chmod 444 /tmp/wtest/.config/weather-cli/cities.json
   printf '3\nottawa\n1\n9\n' | HOME=/tmp/wtest ./weather
   chmod 600 /tmp/wtest/.config/weather-cli/cities.json
   ```
6. **Menú:** automatizado en `tests/presentation/menu.test.ts` (`MENU` da 1..8 sin huecos, `EXIT_OPTION` es la 9). A ojo: `printf '9\n' | ./weather`.
7. **Spinner:** con stdout pipeado no debe aparecer nada (los greps de arriba lo comprueban). Para verlo hace falta una terminal de verdad: `printf '1\n9\n' | ./weather` en una terminal real, o forzando un pty con `script -qc "printf '1\n9\n' | ./weather" /tmp/log` y leyendo `/tmp/log` con `tr '\r' '\n'`. Ojo: `HTTPS_PROXY=http://10.255.255.1:1` **no** cuelga la petición, la rechaza al instante (`Unable to connect`), así que no sirve para ver el contador ni el timeout. Para el camino lento hace falta algo que acepte la conexión y no responda: un `Bun.serve({ fetch: () => new Promise(() => {}) })` al que apuntes, y esperar los 10 s del `AbortSignal.timeout`.
8. `bun run build` y probar `./weather`.
9. **Pronóstico:** `printf '6\n9\n' | ./weather` — 7 filas, la primera con `(hoy)`, columnas alineadas y sin espacios al final de línea. `printf '7\n9\n' | ./weather` — una tabla por ciudad. `printf '8\n6\n9\n' | ./weather` — el rango sale en °F (misma consulta, solo cambia `temperature_unit`).
10. **Alineación con color (la invariante de `formatTable`):** automatizado en `tests/utils/format.test.ts` (con y sin color, quitando los ANSI, la tabla es idéntica). El diff de la salida real, si se quiere ver:
    ```bash
    printf '6\n9\n' | ./weather | tail -n +14 > /tmp/plain.txt
    printf '6\n9\n' | FORCE_COLOR=1 ./weather | sed 's/\x1b\[[0-9;]*m//g' | tail -n +14 > /tmp/color.txt
    diff /tmp/plain.txt /tmp/color.txt && echo "alineación ok"
    ```
11. **Migración del `config.json` legacy:** automatizado en `tests/storage/persistence.test.ts` (supervivencia, no pisar un archivo existente, legacy ilegible que no se borra). A mano:
    ```bash
    mkdir -p /tmp/wmig/.config/weather-cli
    printf '{"cities":[{"id":123,"name":"Ottawa","latitude":45.4,"longitude":-75.7}],"defaultCityId":123,"unit":"fahrenheit"}' \
      > /tmp/wmig/.config/weather-cli/config.json
    printf '9\n' | HOME=/tmp/wmig ./weather | grep -E 'todas|Ajustes'   # (1) y "Ajustes (°F)"
    ls /tmp/wmig/.config/weather-cli/                                   # cities.json  settings.json
    ```
12. **Storage en dos archivos:** (a) y (b) automatizados en `tests/storage/persistence.test.ts` (cada acción escribe un archivo y solo ese); (c) y (d) automatizados en el mismo archivo (legacy no pisa `cities.json`, legacy corrupto no se borra, config ilegible no impide arrancar).
