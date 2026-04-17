import { EventEmitter } from 'node:events';
import { Broker } from './broker.js';

/**
 * A broker for single-process environments.
 * Uses a global shared EventEmitter to simulate cross-shard communication.
 */
export class StandaloneBroker extends Broker {
  public readonly type = "standalone";
  private static readonly emitter = new EventEmitter();
  private readonly rpcHandlers = new Map<string, (args: any, source: number) => any>();
  private readonly shardId: number;

  constructor(shardId: number = 0) {
    super();
    this.shardId = shardId;
    
    // Listen for RPC requests globally
    StandaloneBroker.emitter.on('__rpc_request', async (req: any) => {
      const handler = this.rpcHandlers.get(req.method);
      if (handler) {
        try {
          const result = await handler(req.args, req.sourceShardId);
          StandaloneBroker.emitter.emit(`__rpc_response_${req.id}`, { id: req.id, result });
        } catch (error: any) {
          StandaloneBroker.emitter.emit(`__rpc_response_${req.id}`, { id: req.id, error: error.message });
        }
      }
    });
  }

  public async connect(): Promise<void> {
    // Already connected via static emitter
  }

  public async disconnect(): Promise<void> {
    this.rpcHandlers.clear();
  }

  public async publish(event: string, data: any): Promise<void> {
    StandaloneBroker.emitter.emit(event, data, this.shardId);
  }

  public subscribe(event: string, handler: (data: any, source?: number) => void): void {
    StandaloneBroker.emitter.on(event, handler);
  }

  public async call<T = any>(method: string, args: any, targetShardId?: number): Promise<T> {
    const id = (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        StandaloneBroker.emitter.removeAllListeners(`__rpc_response_${id}`);
        reject(new Error(`RPC call '${method}' timed out.`));
      }, 5000);

      StandaloneBroker.emitter.once(`__rpc_response_${id}`, (res: any) => {
        clearTimeout(timeout);
        if (res.error) reject(new Error(res.error));
        else resolve(res.result);
      });

      StandaloneBroker.emitter.emit('__rpc_request', { id, method, args, sourceShardId: this.shardId, targetShardId });
    });
  }

  public handleRPC(method: string, handler: (args: any, source: number) => any): void {
    this.rpcHandlers.set(method, handler);
  }
}
