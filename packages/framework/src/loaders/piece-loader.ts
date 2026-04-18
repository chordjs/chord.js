import { readdir } from "node:fs/promises";
import { extname, basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "../pieces/command.js";
import { Listener } from "../pieces/listener.js";
import { InteractionCommand, Component, Modal, Piece } from "@chordjs/interactions";
import { ChordClient } from "../structures/chord-client.js";
import type { Store } from "@chordjs/core";

export type PieceModuleExport =
  | Piece
  | (new (...args: any[]) => Piece)
  | ((context: { name: string }) => Piece | Promise<Piece>);

export interface PieceLoaderOptions {
  client: ChordClient;
}

export class PieceLoader {
  public readonly client: ChordClient;

  constructor(options: PieceLoaderOptions) {
    this.client = options.client;
  }

  async loadCommandsFrom(dirPath: string): Promise<Command[]> {
    const store = this.ensureStore<Command>("commands");
    return this.loadStoreFrom(dirPath, store, Command);
  }

  async loadListenersFrom(dirPath: string): Promise<Listener[]> {
    const store = this.ensureStore<Listener>("listeners");
    return this.loadStoreFrom(dirPath, store, Listener);
  }

  async loadInteractionsFrom(dirPath: string): Promise<InteractionCommand[]> {
    const store = this.ensureStore<InteractionCommand>("interactions");
    return this.loadStoreFrom(dirPath, store, InteractionCommand);
  }

  async loadComponentsFrom(dirPath: string): Promise<Component[]> {
    const store = this.ensureStore<Component>("components");
    return this.loadStoreFrom(dirPath, store, Component);
  }

  async loadModalsFrom(dirPath: string): Promise<Modal[]> {
    const store = this.ensureStore<Modal>("modals");
    return this.loadStoreFrom(dirPath, store, Modal);
  }

  async loadStoreFrom<TPiece extends Piece>(
    dirPath: string,
    store: Store<TPiece>,
    expectedBase?: { prototype: TPiece }
  ): Promise<TPiece[]> {
    const files = await this.#collectModuleFiles(dirPath);
    const loaded: TPiece[] = [];

    for (const filePath of files) {
      const mod = await import(pathToFileURL(filePath).href);
      const candidates = [mod.default, ...Object.values(mod)];
      const name = basename(filePath, extname(filePath));

      let piece: Piece | null = null;
      for (const candidate of candidates) {
        piece = await this.#materializePiece(candidate as PieceModuleExport | undefined, name);
        if (piece) break;
      }
      if (!piece) continue;

      if (expectedBase && !(piece instanceof (expectedBase as any))) {
        continue;
      }
      piece.store = store as any;
      store.set(piece.name, piece as TPiece);
      await piece.onLoad?.();
      loaded.push(piece as TPiece);
    }

    return loaded;
  }

  ensureStore<TPiece extends Piece>(name: string): Store<TPiece> {
    try {
      return this.client.store<TPiece>(name);
    } catch {
      return this.client.createStore<TPiece>(name);
    }
  }

  async #materializePiece(candidate: PieceModuleExport | undefined, name: string): Promise<Piece | null> {
    if (!candidate) return null;
    if (candidate instanceof Piece) return candidate;

    if (typeof candidate === "function") {
      // class constructor
      if (candidate.prototype instanceof Piece) {
        try {
          return new (candidate as new (...args: any[]) => Piece)({ name });
        } catch {
          try {
            return new (candidate as new (...args: any[]) => Piece)();
          } catch {
            return null;
          }
        }
      }

      // factory
      try {
        const maybe = await (candidate as (context: { name: string }) => Piece | Promise<Piece>)({ name });
        if (maybe instanceof Piece) return maybe;
      } catch {
        return null;
      }
    }

    return null;
  }

  async #collectModuleFiles(dirPath: string): Promise<string[]> {
    const root = resolve(dirPath);
    const out: string[] = [];

    const walk = async (current: string): Promise<void> => {
      const entries = await readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        const full = resolve(current, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
          continue;
        }
        if (!entry.isFile()) continue;
        if (!this.#isLoadableModule(full)) continue;
        out.push(full);
      }
    };

    await walk(root);
    return out.sort((a, b) => a.localeCompare(b));
  }

  #isLoadableModule(filePath: string): boolean {
    const ext = extname(filePath);
    if (![".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"].includes(ext)) return false;
    if (filePath.endsWith(".d.ts")) return false;
    return true;
  }
}

