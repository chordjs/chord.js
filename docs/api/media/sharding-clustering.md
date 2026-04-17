# Sharding and Clustering

## Sharding

Use `ShardManager` when a single gateway connection is not enough.

- `shardCount`: total shard count.
- `shardIds`: subset handled by current process.
- `identify.minIdentifyIntervalMs`: identify pacing.

`ShardManager.connectAll()` connects each shard in order.

## In-process clusters

`ClusterManager` partitions shard IDs across logical clusters in one process.

## Multi-process clusters

`ProcessClusterManager` starts cluster workers using IPC.

- parent sends commands (`init`, `connectAll`, `closeAll`)
- workers host `ShardManager`
- events/messages can be extended for observability

## Recommended strategy

1. Start with `ShardManager`.
2. Move to `ProcessClusterManager` when CPU/memory grows.
3. Add worker restarts/backoff + health metrics for production.

