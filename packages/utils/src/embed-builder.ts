import type { APIEmbed } from "@chordjs/types";

export class EmbedBuilder {
  public data: Partial<APIEmbed>;

  constructor(data: Partial<APIEmbed> = {}) {
    this.data = { ...data };
    if (data.fields) {
      this.data.fields = [...data.fields];
    }
  }

  setTitle(title: string | null): this {
    if (title === null) delete this.data.title;
    else this.data.title = title;
    return this;
  }

  setDescription(description: string | null): this {
    if (description === null) delete this.data.description;
    else this.data.description = description;
    return this;
  }

  setURL(url: string | null): this {
    if (url === null) delete this.data.url;
    else this.data.url = url;
    return this;
  }

  setTimestamp(timestamp: Date | number | null = Date.now()): this {
    if (timestamp === null) {
      delete this.data.timestamp;
    } else {
      this.data.timestamp = new Date(timestamp).toISOString();
    }
    return this;
  }

  setColor(color: number | null): this {
    if (color === null) delete this.data.color;
    else this.data.color = color;
    return this;
  }

  setFooter(options: { text: string; iconURL?: string } | null): this {
    if (options === null) {
      delete this.data.footer;
    } else {
      this.data.footer = { text: options.text, icon_url: options.iconURL };
    }
    return this;
  }

  setImage(url: string | null): this {
    if (url === null) {
      delete this.data.image;
    } else {
      this.data.image = { url };
    }
    return this;
  }

  setThumbnail(url: string | null): this {
    if (url === null) {
      delete this.data.thumbnail;
    } else {
      this.data.thumbnail = { url };
    }
    return this;
  }

  setAuthor(options: { name: string; url?: string; iconURL?: string } | null): this {
    if (options === null) {
      delete this.data.author;
    } else {
      this.data.author = { name: options.name, url: options.url, icon_url: options.iconURL };
    }
    return this;
  }

  addFields(...fields: Array<{ name: string; value: string; inline?: boolean }>): this {
    if (!this.data.fields) this.data.fields = [];
    this.data.fields.push(...fields);
    return this;
  }

  setFields(...fields: Array<{ name: string; value: string; inline?: boolean }>): this {
    this.data.fields = [...fields];
    return this;
  }

  toJSON(): APIEmbed {
    return { ...this.data } as APIEmbed;
  }
}
