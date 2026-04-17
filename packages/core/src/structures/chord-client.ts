import { Container } from "./container.js";
import { Store } from "./store.js";
import type { Piece } from "./piece.js";
import { UserManager } from "../managers/user-manager.js";
import { GuildManager } from "../managers/guild-manager.js";
import { ChannelManager } from "../managers/channel-manager.js";
import type { RestClient } from "@chordjs/rest";
import type { GatewayClient } from "@chordjs/gateway";
import type { CacheManager } from "@chordjs/cache";
import { PieceLoader } from "../loaders/piece-loader.js";

export interface ChordClientOptions {
  container?: Container;
  rest?: RestClient;
  gateway?: GatewayClient;
  cache?: CacheManager;
}

export class ChordClient {
  public readonly container: Container;
  public rest?: RestClient;
  public gateway?: GatewayClient;
  public cache?: CacheManager;
  public readonly users: UserManager;
  public readonly guilds: GuildManager;
  public readonly channels: ChannelManager;
  public readonly loader: PieceLoader;

  readonly #stores = new Map<string, Store<Piece>>();

  constructor(options: ChordClientOptions = {}) {
    this.container = options.container ?? new Container();
    this.rest = options.rest;
    this.gateway = options.gateway;
    this.cache = options.cache;

    this.users = new UserManager(this);
    this.guilds = new GuildManager(this);
    this.channels = new ChannelManager(this);
    this.loader = new PieceLoader({ client: this });
  }

  get stores(): ReadonlyMap<string, Store<Piece>> {
    return this.#stores;
  }

  createStore<TPiece extends Piece>(name: string): Store<TPiece> {
    if (this.#stores.has(name)) {
      throw new Error(`Store already exists: ${name}`);
    }
    const store = new Store<TPiece>(this, name);
    this.#stores.set(name, store as unknown as Store<Piece>);
    return store;
  }

  store<TPiece extends Piece>(name: string): Store<TPiece> {
    const store = this.#stores.get(name);
    if (!store) throw new Error(`Unknown store: ${name}`);
    return store as unknown as Store<TPiece>;
  }
}
