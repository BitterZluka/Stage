if (typeof window !== "undefined") {
  throw new Error("@stage/world/server cannot be imported in a browser");
}

export * from "./config.js";
export * from "./create-world-provider.js";
export * from "./fake-world.provider.js";
export * from "./normalize-proof.js";
export * from "./real-world.provider.js";
export * from "./server-errors.js";
export * from "./world-provider.interface.js";
