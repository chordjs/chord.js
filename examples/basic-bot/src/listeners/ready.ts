import { Listener, type PieceContext } from "@chordjs/framework";

export default class ReadyListener extends Listener<"READY"> {
  constructor(context: PieceContext) {
    super(context, { 
      event: "READY" 
    });
  }

  run(data: any): void {
    console.log(`✅ Logged in as ${data.user.username}#${data.user.discriminator}`);
    console.log(`🚀 Chord.js bot is now online!`);
  }
}
