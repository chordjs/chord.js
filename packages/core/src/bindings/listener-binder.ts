import type { GatewayDispatchDataMap, GatewayDispatchEvent } from "@chord.js/types";
import type { ChordClient } from "../structures/chord-client.js";
import type { Store } from "../structures/store.js";
import { Listener } from "../pieces/listener.js";

export interface DispatchSource {
  onDispatch<TEvent extends GatewayDispatchEvent>(
    event: TEvent,
    handler: (data: GatewayDispatchDataMap[TEvent]) => void | Promise<void>
  ): unknown;
  onDispatch(event: string, handler: (data: unknown) => void | Promise<void>): unknown;

  offDispatch<TEvent extends GatewayDispatchEvent>(
    event: TEvent,
    handler: (data: GatewayDispatchDataMap[TEvent]) => void | Promise<void>
  ): unknown;
  offDispatch(event: string, handler: (data: unknown) => void | Promise<void>): unknown;
}

export interface GatewayListenerBinderOptions {
  gateway: DispatchSource;
  listenerStore: Store<Listener>;
}

export class GatewayListenerBinder {
  public readonly gateway: DispatchSource;
  public readonly listenerStore: Store<Listener>;
  readonly #bindings = new Map<string, (data: unknown) => Promise<void>>();

  constructor(options: GatewayListenerBinderOptions) {
    this.gateway = options.gateway;
    this.listenerStore = options.listenerStore;
  }

  bindAll(): number {
    let count = 0;
    for (const listener of this.listenerStore.values()) {
      if (this.bind(listener)) count++;
    }
    return count;
  }

  bind(listener: Listener): boolean {
    if (!listener.enabled) return false;
    if (this.#bindings.has(listener.name)) return false;

    const handler = async (data: unknown) => {
      if (!listener.enabled) return;
      await listener.run(data);
      if (listener.once) this.unbind(listener.name);
    };

    this.gateway.onDispatch(listener.event, handler);
    this.#bindings.set(listener.name, handler);
    return true;
  }

  unbind(listenerName: string): boolean {
    const listener = this.listenerStore.get(listenerName);
    const handler = this.#bindings.get(listenerName);
    if (!listener || !handler) return false;
    this.gateway.offDispatch(listener.event, handler);
    this.#bindings.delete(listenerName);
    return true;
  }

  unbindAll(): number {
    let count = 0;
    for (const name of [...this.#bindings.keys()]) {
      if (this.unbind(name)) count++;
    }
    return count;
  }
}

export function bindClientListeners(
  client: ChordClient,
  gateway: DispatchSource,
  storeName = "listeners"
): GatewayListenerBinder {
  const listenerStore = client.store<Listener>(storeName);
  const binder = new GatewayListenerBinder({ gateway, listenerStore });
  binder.bindAll();
  return binder;
}

