# Getting Started

## 1. Install

```bash
bun install
```

## 2. Build

```bash
bun run build
```

## 3. Run basic example

```bash
cd examples/basic-bot
bun install
DISCORD_TOKEN=your_token bun run dev
```

## 4. Typical setup flow

1. Create `ChordClient`.
2. Create/load stores (`commands`, `listeners`, `interactions`).
3. Bind gateway dispatch to listeners.
4. Configure prefix and interaction routers.
5. Connect gateway and use REST for command registration.

## 5. Precondition composition and order

Preconditions run in the order they are registered. Execution stops at the first failure.

Recommended order:

1. Context gate (`guildOnly`)
2. Identity gate (`ownerOnly`)
3. Permission gate (`hasPermissions`)
4. Rate gate (`cooldown`)

Example:

```ts
import { PrefixCommandRouter, guildOnly, ownerOnly, hasPermissions, cooldown } from "@chordjs/core";

const router = new PrefixCommandRouter({
  client,
  prefix: "!",
  preconditions: [
    guildOnly(),
    ownerOnly({ ownerIds: ["123456789012345678"] }),
    hasPermissions({ required: 0x20n }),
    cooldown({ ttlMs: 5_000 })
  ]
});
```

Rules:

- Keep cheap checks first (context/identity), expensive checks later.
- Use specific failure reasons per check when possible.
- For shared guards, create reusable precondition arrays and spread them into routers.

