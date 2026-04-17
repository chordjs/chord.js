import { ChordClient } from "@chordjs/core";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const client = new ChordClient({
  token: process.env.DISCORD_TOKEN || "",
  intents: 32767 // All intents for example purposes
});

// Load pieces
await client.loader.loadCommandsFrom(path.join(__dirname, "commands"));
await client.loader.loadListenersFrom(path.join(__dirname, "listeners"));

// Metrics reporting every minute
setInterval(() => {
  const summary = client.metrics.getSummary();
  console.log("📊 [Enterprise Metrics]");
  console.log(`   Uptime: ${(summary.uptime / 1000).toFixed(2)}s`);
  console.log(`   REST: ${summary.rest.successfulRequests} OK / ${summary.rest.failedRequests} ERR`);
  console.log(`   Gateway: ${summary.gateway.totalEvents} events, Latency: ${summary.gateway.lastPing}ms`);
}, 60_000);

// Initialize
console.log("🚀 Starting Chord.js Enterprise Bot...");
if (client.gateway) {
  client.gateway.connect();
}

// Sync commands globally on startup
client.gateway?.onDispatch("READY", async () => {
  console.log("📡 Bot is ready! Syncing commands...");
  await client.commands.sync();
  console.log("✨ Commands synced globally.");
});
