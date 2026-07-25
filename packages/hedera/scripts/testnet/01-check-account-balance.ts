import { createScriptContext, printResult, run } from "./_shared.js";

run(async () => {
  const { config, hedera } = createScriptContext();
  try {
    printResult({
      network: config.network,
      ...(await hedera.getOperatorBalance()),
    });
  } finally {
    hedera.close();
  }
});
