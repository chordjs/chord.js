import { Listener } from "@chordjs/core";

export default class ReadyListener extends Listener {
  constructor(context: any) {
    super(context, {
      event: "READY",
      once: true
    });
  }

  run(data: any) {
    console.log(`✅ Logged in as ${data.user.username}#${data.user.discriminator}`);
    console.log(`🌍 Shard count: ${data.shard ? data.shard[1] : 1}`);
  }
}
