// null significa que stdin se cerró (Ctrl+D / Ctrl+C) y ya no hay nada que leer.
export type Prompter = (question: string) => Promise<string | null>;
