import type { Snowflake } from "@chordjs/types";
import type { ChordClient } from "../structures/chord-client.js";
import type { User } from "@chordjs/core";

/**
 * Utility for parsing command arguments.
 */
export class Args {
  private _index = 0;

  public constructor(
    public readonly client: ChordClient,
    public readonly raw: string[],
    public readonly message: any
  ) {}

  /**
   * Returns the next argument as a string and advances the index.
   */
  public next(): string | null {
    if (this._index >= this.raw.length) return null;
    return this.raw[this._index++] ?? null;
  }

  /**
   * Peeks at the next argument without advancing the index.
   */
  public peek(): string | null {
    return this.raw[this._index] ?? null;
  }

  /**
   * Returns all remaining arguments as a single string.
   */
  public rest(): string {
    const remains = this.raw.slice(this._index);
    this._index = this.raw.length;
    return remains.join(" ");
  }

  /**
   * Tries to read the next argument as a number.
   */
  public readNumber(): number | null {
    const s = this.next();
    if (s === null) return null;
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  }

  /**
   * Tries to read the next argument as a User (mention or ID).
   */
  public async pickUser(): Promise<User | null> {
    const s = this.next();
    if (!s) return null;

    const id = s.replace(/[<@!>]/g, "") as Snowflake;
    if (!/^\d{16,20}$/.test(id)) return null;

    try {
      return await this.client.users.fetch(id);
    } catch {
      return null;
    }
  }

  /**
   * Resets the parser index.
   */
  public reset(): void {
    this._index = 0;
  }

  public get finished(): boolean {
    return this._index >= this.raw.length;
  }
}
