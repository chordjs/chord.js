export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function assertNever(value: never, message = "Unexpected value"): never {
  throw new Error(`${message}: ${String(value)}`);
}

export * from "@chordjs/collection";
export * from "./attachment-builder.js";
export * from "./emitter.js";
export * from "./embed-builder.js";
export * from "./i18n.js";
export * from "./logger.js";
export * from "./permissions-bitfield.js";
export * from "./routes.js";
