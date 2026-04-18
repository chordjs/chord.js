import { Service, ApplyOptions } from "@chordjs/framework";
import { JsonStore } from "@chordjs/data";
import path from "node:path";

@ApplyOptions({ name: "db" })
export default class DatabaseService extends Service {
  public store!: JsonStore<{ prefix: string; guilds: Record<string, any> }>;

  public async start(): Promise<void> {
    const dbPath = path.join(process.cwd(), "data", "bot_data.json");
    this.store = new JsonStore(dbPath, {
      prefix: "!",
      guilds: {}
    });

    this.context.client.logger.info("DatabaseService started and connected.");
  }

  public getPrefix(guildId?: string): string {
    return this.store.get("prefix");
  }
}
