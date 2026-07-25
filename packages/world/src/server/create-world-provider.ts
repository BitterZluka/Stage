import { FakeWorldProvider } from "./fake-world.provider.js";
import { RealWorldProvider } from "./real-world.provider.js";
import type { WorldServerConfig } from "./config.js";
import type { WorldProvider } from "./world-provider.interface.js";

export function createWorldProvider(
  config: WorldServerConfig,
  fetchImpl: typeof fetch = fetch,
): WorldProvider {
  if (config.provider === "fake") {
    return new FakeWorldProvider({
      rpId: config.rpId,
      scenario: config.fakeScenario,
    });
  }
  return new RealWorldProvider(config, fetchImpl);
}
