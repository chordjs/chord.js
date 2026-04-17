import fs from 'fs';
import path from 'path';

export interface AttachmentData {
  name: string;
  description?: string;
  file: Buffer | string | fs.ReadStream;
}

/**
 * Helper to build file attachments for Discord messages.
 */
export class AttachmentBuilder {
  public name: string;
  public description?: string;
  public file: Buffer | string | fs.ReadStream;

  constructor(file: Buffer | string | fs.ReadStream, name?: string) {
    this.file = file;
    this.name = name ?? (typeof file === 'string' ? path.basename(file) : 'file.bin');
  }

  setName(name: string): this {
    this.name = name;
    return this;
  }

  setDescription(description: string): this {
    this.description = description;
    return this;
  }

  toJSON() {
    return {
      filename: this.name,
      description: this.description,
    };
  }
}
