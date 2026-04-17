import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

/**
 * A simple file-based JSON key-value store.
 */
export class JsonStore<T extends Record<string, any>> {
  private readonly filePath: string;
  private data: T;

  constructor(filePath: string, initialData: T = {} as T) {
    this.filePath = path.resolve(filePath);
    this.data = initialData;
  }

  public async init(): Promise<void> {
    try {
      await access(this.filePath);
      const content = await readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content);
    } catch (error) {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await this.save();
    }
  }

  public get<K extends keyof T>(key: K): T[K] {
    return this.data[key];
  }

  public async set<K extends keyof T>(key: K, value: T[K]): Promise<void> {
    this.data[key] = value;
    await this.save();
  }

  public async update(updater: (data: T) => void | Promise<void>): Promise<void> {
    await updater(this.data);
    await this.save();
  }

  private async save(): Promise<void> {
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  public toJSON(): T {
    return { ...this.data };
  }
}
