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
import { User } from "./user.js";
import type { ChordPlugin } from "./plugin.js";
import type { Broker } from "@chordjs/broker";

export interface ChordClientOptions {
  container?: Container;
  rest?: RestClient;
  gateway?: GatewayClient;
  cache?: CacheManager;
  broker?: Broker;
}

export class ChordClient {
  public readonly container: Container;
  public rest?: RestClient;
  public gateway?: GatewayClient;
  public cache?: CacheManager;
  public broker?: Broker;
  public readonly loader: PieceLoader;
  public readonly users: UserManager;
  public readonly guilds: GuildManager;
  public readonly channels: ChannelManager;

  readonly #stores = new Map<string, Store<Piece>>();
  readonly #plugins = new Map<string, ChordPlugin>();
  #user: User | null = null;

  constructor(options: ChordClientOptions = {}) {
    this.container = options.container ?? new Container();
    this.rest = options.rest;
    this.gateway = options.gateway;
    this.cache = options.cache;
    this.broker = options.broker;

    this.users = new UserManager(this);
    this.guilds = new GuildManager(this);
    this.channels = new ChannelManager(this);
    this.loader = new PieceLoader({ client: this });

    // Gateway event wiring
    if (this.gateway) {
      this.gateway.on("open", () => console.log("📡 Gateway connection established!"));
      this.gateway.on("debug", (msg) => console.log(`[Gateway] ${msg}`));
      this.gateway.on("error", (err) => console.error(`[Gateway Error]`, err));

      // Set client user on READY
      this.gateway.onDispatch("READY", (data: any) => {
        this.#user = new User(this, data.user);
      });
    }
  }

  /**
   * The client user (self). Null if not ready.
   */
  get user(): User | null {
    return this.#user;
  }

  /**
   * Gateway latency in milliseconds.
   */
  get ping(): number {
    return this.gateway?.latency ?? -1;
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

  /**
   * Registers a plugin into the client.
   */
  public async use(plugin: ChordPlugin): Promise<this> {
    if (this.#plugins.has(plugin.name)) {
      throw new Error(`Plugin already registered: ${plugin.name}`);
    }

    await plugin.internalLoad(this);
    this.#plugins.set(plugin.name, plugin);
    
    this.container.get<any>("logger")?.info(`Plugin loaded: ${plugin.name} (v${plugin.version})`);
    return this;
  }
}
