import { Listener } from "@chord.js/core";

export default class ResumedListener extends Listener {
  constructor() {
    super({ name: "resumed", event: "RESUMED" });
  }

  run(): void {
    console.log("[listener:RESUMED] gateway session resumed");
  }
}
