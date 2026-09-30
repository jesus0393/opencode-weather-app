import { toggleUnit } from "../domain/config.ts";
import type { ActionOutcome, AppContext } from "../types/MenuOption.ts";
import { formatUnit } from "../utils/format.ts";

export async function adjustSettings({ config }: AppContext): Promise<ActionOutcome> {
  const updated = toggleUnit(config);
  return {
    config: updated,
    changed: "unit",
    message: [`Unidad de temperatura: ${formatUnit(updated.unit)}.`],
  };
}
