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

  /**
   * Sets the color to Green (0x00ff00) and adds a success title prefix.
   */
  success(title?: string): this {
    this.setColor(0x00ff00);
    if (title) this.setTitle(`✅ ${title}`);
    return this;
  }

  /**
   * Sets the color to Red (0xff0000) and adds an error title prefix.
   */
  error(title?: string): this {
    this.setColor(0xff0000);
    if (title) this.setTitle(`❌ ${title}`);
    return this;
  }

  /**
   * Sets the color to Blue (0x0000ff) and adds an info title prefix.
   */
  info(title?: string): this {
    this.setColor(0x3498db);
    if (title) this.setTitle(`ℹ️ ${title}`);
    return this;
  }

  /**
   * Sets the color to Yellow (0xffff00) and adds a warning title prefix.
   */
  warn(title?: string): this {
    this.setColor(0xf1c40f);
    if (title) this.setTitle(`⚠️ ${title}`);
    return this;
  }

  toJSON(): APIEmbed {
    return { ...this.data } as APIEmbed;
  }
}
