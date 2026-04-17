import { Piece, type PieceContext, type PieceOptions } from "../structures/piece.js";

export interface ListenerOptions<T extends string = string> extends PieceOptions {
  event: T;
  once?: boolean;
}

export abstract class Listener<T extends string = string> extends Piece {
  public readonly event: T;
  public readonly once: boolean;

  protected constructor(context: PieceContext, options: ListenerOptions<T>) {
    super(context, options);
    this.event = options.event;
    this.once = options.once ?? false;
  }

  public override async onLoad(): Promise<void> {
    const gateway = this.store?.client.gateway;
    if (!gateway) return;

    const handler = this.#runBound as (data: unknown) => void | Promise<void>;
    const event = this.event as string;

    if (this.once) {
      gateway.onceDispatch(event, handler);
    } else {
      gateway.onDispatch(event, handler);
    }
  }

  public override async onUnload(): Promise<void> {
    const gateway = this.store?.client.gateway;
    if (!gateway) return;

    const handler = this.#runBound as (data: unknown) => void | Promise<void>;
    const event = this.event as string;
    gateway.offDispatch(event, handler);
  }

  readonly #runBound = (data: unknown) => this.run(data);

  abstract run(...args: any[]): unknown | Promise<unknown>;
}
