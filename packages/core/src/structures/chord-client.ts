import { Store } from "./store.js";
import { UserManager } from "../managers/user-manager.js";
import { GuildManager } from "../managers/guild-manager.js";
import { ChannelManager } from "../managers/channel-manager.js";
import { ApplicationCommandManager } from "../managers/application-command-manager.js";
import { RestClient } from "@chordjs/rest";
import { GatewayClient } from "@chordjs/gateway";
import type { CacheManager } from "@chordjs/cache";
import { User } from "./user.js";
import { BaseEntity } from "./entity.js";
import { SKU } from "./sku.js";
import { Entitlement } from "./entitlement.js";
import { Application } from "./application.js";
import type { Broker } from "@chordjs/broker";
import { 
  type SKU as APISKU, 
  type Entitlement as APIEntitlement, 
  type Snowflake, 
  type ApplicationRoleConnectionMetadata,
  type Application as APIApplication,
  type GatewayIntentResolvable,
  resolveGatewayIntents
} from "@chordjs/types";

export interface ChordClientOptions {
  rest?: RestClient;
  gateway?: GatewayClient;
  cache?: CacheManager;
  broker?: Broker;
  token?: string;
  intents?: GatewayIntentResolvable;
}

export class ChordClient {
  public readonly users: UserManager;
  public readonly guilds: GuildManager;
  public readonly channels: ChannelManager;
  public readonly commands: ApplicationCommandManager;
  public cache?: CacheManager;
  public broker?: Broker;

  readonly #stores = new Map<string, Store<any>>();
  #user: User | null = null;
  #rest?: RestClient;
  #gateway?: GatewayClient;

  constructor(options: ChordClientOptions = {}) {
    const intents = options.intents !== undefined ? resolveGatewayIntents(options.intents) : 0;
    
    this.rest = options.rest ?? (options.token ? new RestClient({ token: options.token }) : undefined);
    this.gateway = options.gateway ?? (options.token ? new GatewayClient({
      token: options.token,
      intents: intents
    }) : undefined);
    this.cache = options.cache;
    this.broker = options.broker;

    this.users = new UserManager(this);
    this.guilds = new GuildManager(this);
    this.channels = new ChannelManager(this);
    this.commands = new ApplicationCommandManager(this);

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

  public get rest(): RestClient | undefined {
    return this.#rest;
  }

  public set rest(value: RestClient | undefined) {
    this.#rest = value;
  }

  public get gateway(): GatewayClient | undefined {
    return this.#gateway;
  }

  public set gateway(value: GatewayClient | undefined) {
    this.#gateway = value;
  }

  /**
   * Gateway latency in milliseconds.
   */
  get ping(): number {
    return this.gateway?.latency ?? -1;
  }

  createStore<T>(name: string): Store<T> {
    if (this.#stores.has(name)) {
      throw new Error(`Store already exists: ${name}`);
    }
    const store = new Store<T>(this, name);
    this.#stores.set(name, store as unknown as Store<any>);
    return store;
  }

  store<T>(name: string): Store<T> {
    const store = this.#stores.get(name);
    if (!store) throw new Error(`Unknown store: ${name}`);
    return store as unknown as Store<T>;
  }

  /**
   * The application ID of the client. Extracted from the token if not provided.
   */
  public get applicationId(): string {
    if (!this.rest?.token) throw new Error("Client token is not set.");
    const parts = this.rest.token.split(".");
    if (parts.length < 1) throw new Error("Invalid token format.");
    return Buffer.from(parts[0], "base64").toString();
  }

  /**
   * Fetches all SKUs for the application.
   */
  public async fetchSKUs(): Promise<SKU[]> {
    if (!this.rest) throw new Error("REST client is not initialized.");
    const data = await this.rest.get(`/applications/${this.applicationId}/skus`) as APISKU[];
    return data.map(s => new SKU(this, s));
  }

  /**
   * Fetches entitlements for the application.
   */
  public async fetchEntitlements(options?: { user_id?: Snowflake, sku_ids?: Snowflake[], guild_id?: Snowflake, before?: Snowflake, after?: Snowflake, limit?: number, exclude_ended?: boolean }): Promise<Entitlement[]> {
    if (!this.rest) throw new Error("REST client is not initialized.");
    const query = new URLSearchParams();
    if (options) {
      for (const [key, value] of Object.entries(options)) {
        if (value !== undefined) query.append(key, Array.isArray(value) ? value.join(",") : String(value));
      }
    }
    const path = `/applications/${this.applicationId}/entitlements${query.toString() ? `?${query.toString()}` : ""}`;
    const data = await this.rest.get(path) as APIEntitlement[];
    return data.map(e => new Entitlement(this, e));
  }

  /**
   * Fetches the application role connection metadata records.
   */
  public async fetchRoleConnectionMetadata(): Promise<ApplicationRoleConnectionMetadata[]> {
    if (!this.rest) throw new Error("REST client is not initialized.");
    return await this.rest.get(`/applications/${this.applicationId}/role-connections/metadata`) as ApplicationRoleConnectionMetadata[];
  }

  /**
   * Updates the application role connection metadata records.
   */
  public async editRoleConnectionMetadata(metadata: ApplicationRoleConnectionMetadata[]): Promise<ApplicationRoleConnectionMetadata[]> {
    if (!this.rest) throw new Error("REST client is not initialized.");
    return await this.rest.put(`/applications/${this.applicationId}/role-connections/metadata`, {
      body: JSON.stringify(metadata)
    }) as ApplicationRoleConnectionMetadata[];
  }

  /**
   * Fetches the current application information.
   */
  public async fetchApplication(): Promise<Application> {
    if (!this.rest) throw new Error("REST client is not initialized.");
    const data = await this.rest.get("/applications/@me") as APIApplication;
    return new Application(this, data);
  }
}
