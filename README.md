# 🎵 chord.js

**A powerful, type-safe Discord bot framework for modern TypeScript & Bun.**

[![npm version](https://img.shields.io/npm/v/@chord.js/core.svg?style=flat-square)](https://www.npmjs.com/package/@chord.js/core)
[![license](https://img.shields.io/npm/l/@chord.js/core.svg?style=flat-square)](https://github.com/chord-js/chord.js/blob/main/LICENSE)
[![ci](https://github.com/chord-js/chord.js/actions/workflows/ci.yml/badge.svg)](https://github.com/chord-js/chord.js/actions)

Chord.js is a modular Discord framework inspired by **discord.js** and **Sapphire**, built from the ground up for performance with **Bun** and **TypeScript native** support.

## 🚀 Key Features

- **🧩 Truly Modular**: Monorepo architectures allowing you to pick only what you need (REST, Gateway, Cache, etc.)
- **⚡ Supercharged Sharding**: Built-in clustering and process-based sharding for massive scale.
- **🛡️ Built-in Type Safety**: Hand-maintained high-fidelity types for the latest Discord API.
- **📦 Zero-Cache by Default**: Optimized for stateless environments with optional high-performance in-memory caching.
- **🛠️ Developer Experience**: Fluent builders, precondition hooks, and folder-based routing helpers.

## 📦 Packages

- [`@chord.js/core`](./packages/core): The core framework, pieces, and routers.
- [`@chord.js/gateway`](./packages/gateway): Gateway, Sharding, Clustering, and Voice support.
- [`@chord.js/cache`](./packages/cache): High-performance in-memory caching layer.
- [`@chord.js/rest`](./packages/rest): Robust Discord REST client with rate-limit management.
- [`@chord.js/types`](./packages/types): Comprehensive Discord API and Gateway types.
- [`@chord.js/utils`](./packages/utils): Common utilities and builders.

## 🛠️ Getting Started

The easiest way to start is using the official CLI:

```bash
# Create a new project
bunx @chord.js/cli init my-bot

# Navigate to project
cd my-bot

# Run in development mode
bun run dev
```

### 📦 Manual Installation

```bash
bun install @chord.js/core @chord.js/gateway
```

## 🛠️ CLI Usage

Chord.js comes with a powerful CLI to speed up your development:

- `chord init [name]`: Scaffold a new project.
- `chord generate <type> <name>`: Create pieces (commands, listeners, etc.).
- `chord dev`: Run with auto-reload.
- `chord start`: Run in production mode.

## 🌟 Examples

- [Basic Bot](./examples/basic-bot): Minimal connection example (used as `init` template).
- [Production Ready Bot](./examples/folder-routing-sharding): Folder routing, sharding, and clustering.

## 📖 Documentation

- [API Reference](https://chord-js.github.io/chord.js) (Coming Soon / Locally at `docs/api`)
- [Architecture](./docs/architecture.md)
- [Sharding & Clustering Guide](./docs/sharding-clustering.md)

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
