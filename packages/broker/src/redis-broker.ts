import Redis, { type RedisOptions } from 'ioredis';
import { Broker } from './broker.js';

/**
 * A broker for distributed environments using Redis Pub/Sub.
 */
export class RedisBroker extends Broker {
  public readonly type = "redis";
  private readonly pub: Redis;
  private readonly sub: Redis;
  private readonly shardId: number;
  private readonly rpcHandlers = new Map<string, (args: any, source: number) => any>();
  private readonly prefix: string;

  constructor(options: RedisOptions & { shardId?: number; prefix?: string } = {}) {
    super();
    this.shardId = options.shardId ?? 0;
    this.prefix = options.prefix ?? 'chord';
    this.pub = new Redis(options);
    this.sub = new Redis(options);
  }

  public async connect(): Promise<void> {
    await Promise.all([
      this.pub.connect().catch(() => {}), // Ignore if already connecting
      this.sub.connect().catch(() => {}),
    ]);

    await this.sub.psubscribe(`${this.prefix}:*`);
    
    this.sub.on('pmessage', async (_pattern: string, channel: string, message: string) => {
      const payload = JSON.parse(message);
      const event = channel.replace(`${this.prefix}:`, '');

      if (event === '__rpc_request') {
        const handler = this.rpcHandlers.get(payload.method);
        if (handler && (payload.targetShardId === undefined || payload.targetShardId === this.shardId)) {
          try {
            const result = await handler(payload.args, payload.sourceShardId);
            await this.pub.publish(`${this.prefix}:__rpc_response:${payload.id}`, JSON.stringify({ id: payload.id, result }));
          } catch (error: any) {
            await this.pub.publish(`${this.prefix}:__rpc_response:${payload.id}`, JSON.stringify({ id: payload.id, error: error.message }));
          }
        }
      } else {
        this.emit(event, payload.data, payload.sourceShardId);
      }
    });
  }

  public async disconnect(): Promise<void> {
    await Promise.all([this.pub.quit(), this.sub.quit()]);
  }

  public async publish(event: string, data: any): Promise<void> {
    await this.pub.publish(`${this.prefix}:${event}`, JSON.stringify({
      data,
      sourceShardId: this.shardId
    }));
  }

  public subscribe(event: string, handler: (data: any, source?: number) => void): void {
    this.on(event, handler);
  }

  public async call<T = any>(method: string, args: any, targetShardId?: number): Promise<T> {
    const id = (globalThis as any).crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const responseChannel = `${this.prefix}:__rpc_response:${id}`;

    const sub = new Redis(this.pub.options);
    await sub.subscribe(responseChannel);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        sub.quit();
        reject(new Error(`RPC call '${method}' timed out.`));
      }, 5000);

      sub.on('message', (_channel: string, message: string) => {
        const res = JSON.parse(message);
        clearTimeout(timeout);
        sub.quit();
        if (res.error) reject(new Error(res.error));
        else resolve(res.result);
      });

      this.pub.publish(`${this.prefix}:__rpc_request`, JSON.stringify({
        id, method, args, sourceShardId: this.shardId, targetShardId
      }));
    });
  }

  public handleRPC(method: string, handler: (args: any, source: number) => any): void {
    this.rpcHandlers.set(method, handler);
  }
}
