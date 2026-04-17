import { 
  ButtonStyle, 
  ComponentType,
  type ButtonComponent,
  type SelectMenuComponent,
  type SelectMenuOption
} from "@chordjs/types";

export class ButtonBuilder {
  public data: Partial<ButtonComponent> = {
    type: ComponentType.Button as 2
  };

  public setStyle(style: number): this {
    this.data.style = style;
    return this;
  }

  public setLabel(label: string): this {
    this.data.label = label;
    return this;
  }

  public setCustomId(customId: string): this {
    this.data.custom_id = customId;
    return this;
  }

  public setURL(url: string): this {
    this.data.url = url;
    return this;
  }

  public setEmoji(emoji: { id?: string; name?: string; animated?: boolean }): this {
    this.data.emoji = emoji;
    return this;
  }

  public setDisabled(disabled = true): this {
    this.data.disabled = disabled;
    return this;
  }

  public toJSON(): ButtonComponent {
    return this.data as ButtonComponent;
  }
}

export class SelectMenuBuilder {
  public data: Partial<SelectMenuComponent> = {
    type: ComponentType.StringSelect as 3,
    options: []
  };

  public setCustomId(customId: string): this {
    this.data.custom_id = customId;
    return this;
  }

  public setPlaceholder(placeholder: string): this {
    this.data.placeholder = placeholder;
    return this;
  }

  public setMinValues(min: number): this {
    this.data.min_values = min;
    return this;
  }

  public setMaxValues(max: number): this {
    this.data.max_values = max;
    return this;
  }

  public setDisabled(disabled = true): this {
    this.data.disabled = disabled;
    return this;
  }

  public addOptions(...options: SelectMenuOption[]): this {
    this.data.options ??= [];
    this.data.options.push(...options);
    return this;
  }

  public setOptions(options: SelectMenuOption[]): this {
    this.data.options = options;
    return this;
  }

  public toJSON(): SelectMenuComponent {
    return this.data as SelectMenuComponent;
  }
}
