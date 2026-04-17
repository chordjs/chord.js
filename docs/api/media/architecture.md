# Architecture

## Packages

- `@chordjs/types`: shared protocol/data types.
- `@chordjs/rest`: Discord REST with route normalization + rate-limit handling.
- `@chordjs/gateway`: main gateway + sharding + clustering + voice gateway.
- `@chordjs/core`: framework layer (pieces/stores/loaders/routers/hooks).

## Core model

- `Piece`: base unit (`Command`, `Listener`, `InteractionCommand`).
- `Store<TPiece>`: runtime registry for pieces.
- `PieceLoader`: file-system loader for commands/listeners.
- Routers:
  - `PrefixCommandRouter`
  - `InteractionCommandRouter`
- `GatewayListenerBinder`: dispatch event to listener execution.

## Runtime flow

1. Boot client and stores.
2. Load pieces from filesystem.
3. Bind gateway to listener router.
4. Register slash commands via REST.
5. Start gateway and process events.

