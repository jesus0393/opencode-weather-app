import { createPrompter } from "./presentation/input.ts";
import { EXIT_OPTION, MENU, printMenu } from "./presentation/menu.ts";
import { printBanner, printError, printSuccess } from "./presentation/output.ts";
import { loadConfig, persist } from "./storage/config.ts";
import { colors } from "./utils/colors.ts";
import { describeError } from "./utils/errors.ts";

async function main(): Promise<void> {
  const { ask, close } = createPrompter();
  let config = await loadConfig();

  try {
    for (;;) {
      printBanner();
      printMenu(config);

      const option = await ask("  Selecciona una opción: ");
      if (option === null || option === EXIT_OPTION) break;

      const entry = MENU.find((item) => item.option === option);
      if (!entry) {
        printError(`Opción inválida: "${option}".`);
        continue;
      }

      try {
        const outcome = await entry.run({ config, ask });
        if (!outcome) continue;

        // Solo tras guardar: si el write falla, la app sigue con el config viejo.
        const saved = await persist(outcome.config, outcome.changed);
        if (!saved.ok) {
          printError(`No se pudo guardar la configuración: ${saved.reason}`);
          continue;
        }

        config = outcome.config;
        outcome.message.forEach(printSuccess);
      } catch (error) {
        printError(`Error: ${describeError(error)}`);
      }
    }
  } finally {
    close();
  }

  console.log(`  ${colors.dim("Hasta luego.")}\n`);
}

await main();
