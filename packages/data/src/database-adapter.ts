/**
 * Represents a generic database connection.
 * This can be wrapped around Prisma, Kysely, or any other ORM.
 */
export abstract class DatabaseAdapter<TInstance = any> {
  public abstract readonly name: string;
  protected instance: TInstance | null = null;

  constructor(instance?: TInstance) {
    if (instance) this.instance = instance;
  }

  /**
   * Connects to the database.
   */
  public abstract connect(): Promise<void>;

  /**
   * Disconnects from the database.
   */
  public abstract disconnect(): Promise<void>;

  /**
   * The underlying database instance (e.g. PrismaClient).
   */
  public get db(): TInstance {
    if (!this.instance) throw new Error(`DatabaseAdapter '${this.name}' is not initialized.`);
    return this.instance;
  }

  /**
   * Checks if the database is connected.
   */
  public abstract isConnected(): boolean;
}

/**
 * A simple wrapper for Prisma to fit into Chord.js architecture.
 */
export class PrismaAdapter extends DatabaseAdapter {
  public readonly name = "prisma";

  constructor(prismaInstance: any) {
    super(prismaInstance);
  }

  public async connect(): Promise<void> {
    if (typeof this.db.$connect === 'function') {
      await this.db.$connect();
    }
  }

  public async disconnect(): Promise<void> {
    if (typeof this.db.$disconnect === 'function') {
      await this.db.$disconnect();
    }
  }

  public isConnected(): boolean {
    return !!this.instance;
  }
}
