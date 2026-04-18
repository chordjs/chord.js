# Chord.js Shard Cluster Template

This template provides a scalable foundation for large Discord bots using process-based sharding (clustering).

## Project Structure

- `src/index.ts`: The Shard Manager (Parent process). It spawns and manages bot clusters.
- `src/bot.ts`: The Bot Worker (Child process). Each instance represents a cluster of shards.
- `src/commands/`: Your command pieces.
- `src/listeners/`: Your event listener pieces.

## How it works

1. The `Manager` (`index.ts`) calculates the required number of shards (or uses "auto").
2. It splits these shards into multiple clusters (processes).
3. Each `Bot` (`bot.ts`) process initializes a `ChordClient` for its assigned shards.
4. The Manager handles automatic restarts if a cluster process crashes.

## Getting Started

1. Copy `.env.example` to `.env` and add your bot token.
2. Install dependencies: `bun install`
3. Run in development: `bun run dev`

## Deployment

Build the project: `bun run build`
Start the manager: `bun run start`
