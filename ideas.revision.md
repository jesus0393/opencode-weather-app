# Revisión Weather CLI

- [x] **Colores:** no hay ninguno; falta definir cyan (menú), amarillo (temp), verde/rojo (ok/error).
- [x] **AGENTS.md:** dice que `index.ts` es stub, pero la app ya funciona — hay que actualizarlo.
- [x] **Ciudades:** geocoding solo trae 1 resultado; nombres ambiguos pueden fallar.
- [x]**Tests:** 133 tests con `bun test` (`bun run test`): domain, storage, api, utils, presentación, acciones y menú. Storage en disco se prueba arrancando la app real con `HOME` temporal.
- [x] **Binario:** compila bien; revisar que `./weather` guarde datos en `~/.config/weather-cli/`.
- [x]**Escalabilidad:** ¿qué tan fácil será expandir con nuevas funcionalidades?
- [x]**Carga:** ¿hay estado de carga en las tareas asíncronas?
- [x]**7 days forecast:** agregar la posibilidad de tener el pronostico del clima por los proximos 7 dias
