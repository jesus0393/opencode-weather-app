# Weather CLI

App de consola en Bun.js que consulta clima con OpenMeteo. Objetivo final: binario compilado.
Documentación funcional (menú esperado, endpoints) en `README.md` (en español).

## Comandos

```bash
bun run start              # ejecutar
bun run dev                # ejecutar con recarga automática
bun run build              # binario
bunx tsc --noEmit          # typecheck (única verificación disponible)
```

## Restricciones del repo

- **Bun, no Node.** No uses `npm run`: los scripts de `package.json` están pensados para `bun run`.
- **TypeScript 7** como peer dep (`typescript@^7`, binario nativo en `@typescript/typescript-linux-x64`).
- **No hay framework de test, linter ni formatter configurados.** No inventes comandos de test/lint; verifica con `bunx tsc --noEmit`.
- `tsconfig.json`: `noUncheckedIndexedAccess: true` → el acceso a índices/records devuelve `T | undefined`. Manejalo explícitamente.
- `verbatimModuleSyntax: true` → los type-only imports requieren `import type { X }`.
- `allowImportingTsExtensions: true` → los imports entre archivos locales llevan extensión `.ts`.

## API (sin SDK, `fetch` directo)

1. Geocoding → lat/lon:
   `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=es&format=json`
2. Clima actual:
   `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m`

Fluent de API en inglés, valores/etiquetas de clima en español (`language=es`).

## Menú esperado

Interactivo por `stdin`. Opciones de `README.md`: clima default, clima de todas las ciudades, agregar ciudad, eliminar ciudad, establecer default, ajustes de unidad, salir. Ojo: la numeración del README salta de 5 a 8 — no es un bug a arreglar sin confirmar.
