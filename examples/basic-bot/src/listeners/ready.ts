import { Listener } from "@chord.js/core";

export default class ReadyListener extends Listener<"READY"> {
  constructor() {
    super({ 
      event: "READY" 
    });
  }

  run(data: any): void {
    console.log(`✅ Logged in as ${data.user.username}#${data.user.discriminator}`);
    console.log(`🚀 Chord.js bot is now online!`);
  }
}
