import { Listener } from "@chordjs/core";
import type { ReadyDispatchData } from "@chordjs/types";

export default class ReadyListener extends Listener {
  constructor() {
    super({ name: "ready", event: "READY" });
  }

  run(data: ReadyDispatchData): void {
    console.log(`[listener:READY] logged in as ${data.user.username} (${data.user.id})`);
  }
}
