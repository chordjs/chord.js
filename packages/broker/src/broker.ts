import { EventEmitter } from 'node:events';

export interface BrokerMessage<T = any> {
  event: string;
  data: T;
  sourceShardId?: number;
}

export interface RPCRequest<T = any> {
  id: string;
  method: string;
  args: T;
  sourceShardId: number;
}

export interface RPCResponse<T = any> {
  id: string;
  result?: T;
  error?: string;
}

/**
 * Base abstract class for messaging brokers.
 */
export abstract class Broker extends EventEmitter {
  public abstract readonly type: string;

  /**
   * Connects to the broker.
   */
  public abstract connect(): Promise<void>;

  /**
   * Disconnects from the broker.
   */
  public abstract disconnect(): Promise<void>;

  /**
   * Publishes a message to all shards.
   */
  public abstract publish(event: string, data: any): Promise<void>;

  /**
   * Subscribes to a specific event.
   */
  public abstract subscribe(event: string, handler: (data: any, sourceShardId?: number) => void | Promise<void>): void;

  /**
   * Executes a remote method on another shard or all shards.
   * Returns a promise that resolves with the result.
   */
  public abstract call<T = any>(method: string, args: any, targetShardId?: number): Promise<T>;

  /**
   * Handles an RPC request from another shard.
   */
  public abstract handleRPC(method: string, handler: (args: any, sourceShardId: number) => any | Promise<any>): void;
}
