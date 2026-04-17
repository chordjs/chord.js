import { Listener } from "@chord.js/core";

export default class ErrorListener extends Listener {
  constructor() {
    super({
      name: "error",
      event: "error"
    });
  }

  run(error: unknown): void {
    console.error("[ErrorListener] A client or gateway error occurred:", error);
  }
}
