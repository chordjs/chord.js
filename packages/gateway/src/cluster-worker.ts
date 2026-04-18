import { GatewayConnectionStatus } from "@chordjs/types";
import type { ClusterWorkerInit, ClusterWorkerCommand, ClusterWorkerEvent } from "./process-clustering.js";

export abstract class ClusterWorker {
  constructor() {
    process.on("message", (msg: ClusterWorkerCommand) => {
      void this.#handleCommand(msg);
    });
  }

  /**
   * Called when the manager sends initial configuration.
   */
  abstract onInit(data: ClusterWorkerInit): Promise<void>;

  /**
   * Called when the manager requests all shards to connect.
   */
  abstract onConnectAll(): Promise<void>;

  /**
   * Called when the manager requests all shards to close.
   */
  onCloseAll(_code?: number, _reason?: string): void {}

  /**
   * Notifies the manager that this cluster is ready to connect shards.
   */
  protected sendReady(): void {
    this.#send({ op: "ready" });
  }

  /**
   * Sends a log message to the manager.
   */
  protected sendLog(level: "debug" | "info" | "warn" | "error", message: string): void {
    this.#send({ op: "log", level, message });
  }

  /**
   * Notifies the manager of a status update.
   */
  protected sendStatusUpdate(status: GatewayConnectionStatus): void {
    this.#send({ op: "statusUpdate", status });
  }

  /**
   * Notifies the manager of an error.
   */
  protected sendError(message: string): void {
    this.#send({ op: "error", message });
  }

  #send(ev: ClusterWorkerEvent): void {
    process.send?.(ev);
  }

  async #handleCommand(cmd: ClusterWorkerCommand): Promise<void> {
    try {
      switch (cmd.op) {
        case "init":
          await this.onInit(cmd.d);
          this.sendReady();
          break;
        case "connectAll":
          await this.onConnectAll();
          break;
        case "closeAll":
          this.onCloseAll(cmd.d?.code, cmd.d?.reason);
          break;
        case "ping":
          this.#send({ op: "pong", nonce: cmd.nonce });
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.sendError(`Failed to execute command ${cmd.op}: ${msg}`);
    }
  }
}
