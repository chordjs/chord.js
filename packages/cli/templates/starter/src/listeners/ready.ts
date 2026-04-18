import { Listener, ApplyOptions } from "@chordjs/framework";

@ApplyOptions({ 
  name: "ready",
  event: "READY",
  once: true 
})
export default class ReadyListener extends Listener {
  public async run() {
    this.context.client.logger.info(`Logged in as ${this.context.client.user?.username}!`);
    
    // Auto-sync application commands on startup
    const interactionRouter = this.context.client.container.get<any>("InteractionCommandRouter");
    if (interactionRouter) {
      this.context.client.logger.info("Synchronizing application commands...");
      await interactionRouter.registerGlobalCommands();
    }
  }
}
