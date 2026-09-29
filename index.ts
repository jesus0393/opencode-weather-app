import { loadConfig, saveConfig } from "./src/services/configStore.ts";
import { ACTIONS, describeError } from "./src/ui/actions.ts";
import { createPrompter, printBanner, printError, printMenu } from "./src/ui/console.ts";

const EXIT_OPTION = "9";

async function main(): Promise<void> {
  const { ask, close } = createPrompter();
  let config = await loadConfig();

  try {
    for (;;) {
      printBanner();
      printMenu(config);

      const option = await ask("  Selecciona una opción: ");
      if (option === null || option === EXIT_OPTION) break;

      const action = ACTIONS[option];
      if (!action) {
        printError(`Opción inválida: "${option}".`);
        continue;
      }

      try {
        const updated = await action({ config, ask });
        if (updated) {
          config = updated;
          await saveConfig(config);
        }
      } catch (error) {
        printError(`Error: ${describeError(error)}`);
      }
    }
  } finally {
    close();
  }

  console.log("  Hasta luego.\n");
}

await main();
