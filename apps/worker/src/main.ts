export const workerConfig = {
  queueName: "blockchain-operations",
  pollIntervalMs: 5_000,
} as const;

// TODO: Stage 1 wires BullMQ consumers to transactional-outbox operation IDs.
console.log(`Worker scaffold ready for queue: ${workerConfig.queueName}`);
