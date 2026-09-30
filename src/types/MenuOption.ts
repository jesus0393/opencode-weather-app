import type { Config } from "./Config.ts";
import type { Prompter } from "./Prompter.ts";
import type { ChangedSlice } from "./Storage.ts";

export interface AppContext {
  config: Config;
  ask: Prompter;
}

// Las acciones no confirman nada: describen el cambio y el loop lo persiste y avisa.
export interface ActionOutcome {
  config: Config;
  // Acertar este literal importa: si dice "unit" en una acción que agregó una ciudad,
  // el loop guardaría el archivo equivocado y dejaría la memoria y el disco
  // divergentes.
  changed: ChangedSlice;
  message: string[];
}

// null significa que no hay nada que persistir.
export type Action = (context: AppContext) => Promise<ActionOutcome | null>;

// Una opción nueva se declara en MENU y en ningún otro sitio: número, etiqueta y
// acción en la misma entrada. El label es una función porque algunas entradas
// dependen del config, p. ej. el conteo de ciudades o la unidad vigente.
export interface MenuOption {
  option: string;
  label: (config: Config) => string;
  run: Action;
}
