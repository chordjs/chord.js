# Production Guide

## Token and secrets

- Never hardcode `DISCORD_TOKEN` in source files.
- Use environment variables or secret managers.
- Rotate tokens if leaked and restart all workers/shards.

## Intents and privileged intents

- Request only intents you actually need.
- If you use `MessageContent`, enable it in the Discord Developer Portal.
- For large bots, review intent usage regularly to reduce event volume.

## Sharding strategy

- Start with `SHARD_COUNT=auto` for recommended shard count.
- Use `MODE=shard` for single-process sharding baseline.
- Move to `MODE=cluster` or `MODE=process` when CPU/event load grows.
- Stagger identify with scheduler defaults; avoid aggressive manual reconnect loops.

## Clustering and failover

- Prefer `ProcessClusterManager` for isolation under heavy load.
- Keep `restartOnExit` enabled with backoff defaults unless debugging.
- Monitor `ready/error/exit` events and alert on repeated restart bursts.
- Set `maxRestarts` to a finite value in production to prevent endless crash loops.

## Rate limits and REST safety

- Keep REST requests through the shared `RestClient` to preserve bucket state.
- Avoid creating multiple independent REST clients per shard unless necessary.
- Backpressure command responses when 429s become frequent.

## Observability baseline

- Track shard metrics (`latencyMs`, `lastHeartbeatAckAt`, `resumeCount`).
- Track process-cluster events (`ready`, `error`, `exit`, `log`).
- Log command errors with correlation fields (`shardId`, `clusterId`, `guildId`, `commandName`).

## Deployment checklist

1. `bun run build` passes.
2. Required env vars are set (`DISCORD_TOKEN`, optional `OWNER_IDS`).
3. Intents are enabled in portal for configured features.
4. `SHARD_COUNT` strategy validated (`auto` or fixed override).
5. Alerting for worker exits/restarts is active.
