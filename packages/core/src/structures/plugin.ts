import type { ChordClient } from "./chord-client.js";

/**
 * Base class for all Chord.js plugins.
 * Plugins can encapsulate commands, listeners, services, and other logic.
 */
export abstract class ChordPlugin {
  public abstract readonly name: string;
  public readonly version: string = "0.0.0";
  protected client!: ChordClient;

  public internalLoad(client: ChordClient): void | Promise<void> {
    this.client = client;
    return this.onLoad();
  }

  public internalUnload(): void | Promise<void> {
    return this.onUnload();
  }

  /**
   * Called when the plugin is loaded into the client.
   */
  public abstract onLoad(): void | Promise<void>;

  /**
   * Called when the plugin is unloaded.
   */
  public onUnload(): void | Promise<void> {}
}
