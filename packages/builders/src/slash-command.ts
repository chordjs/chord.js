import { 
  ApplicationCommandTypes, 
  ApplicationCommandOptionTypes,
  type ApplicationCommandOption,
  type ApplicationCommand
} from "@chordjs/types";

export class SlashCommandBuilder {
  public name = "";
  public description = "";
  public options: ApplicationCommandOption[] = [];
  public default_member_permissions: string | null = null;
  public dm_permission: boolean | null = null;
  public nsfw?: boolean;

  public setName(name: string): this {
    this.name = name;
    return this;
  }

  public setDescription(description: string): this {
    this.description = description;
    return this;
  }

  public addStringOption(fn: (option: SlashCommandStringOption) => SlashCommandStringOption): this {
    const option = fn(new SlashCommandStringOption());
    this.options.push(option.toJSON());
    return this;
  }

  public addIntegerOption(fn: (option: SlashCommandIntegerOption) => SlashCommandIntegerOption): this {
    const option = fn(new SlashCommandIntegerOption());
    this.options.push(option.toJSON());
    return this;
  }

  public addBooleanOption(fn: (option: SlashCommandBooleanOption) => SlashCommandBooleanOption): this {
    const option = fn(new SlashCommandBooleanOption());
    this.options.push(option.toJSON());
    return this;
  }

  public addUserOption(fn: (option: SlashCommandUserOption) => SlashCommandUserOption): this {
    const option = fn(new SlashCommandUserOption());
    this.options.push(option.toJSON());
    return this;
  }

  public addChannelOption(fn: (option: SlashCommandChannelOption) => SlashCommandChannelOption): this {
    const option = fn(new SlashCommandChannelOption());
    this.options.push(option.toJSON());
    return this;
  }

  public addRoleOption(fn: (option: SlashCommandRoleOption) => SlashCommandRoleOption): this {
    const option = fn(new SlashCommandRoleOption());
    this.options.push(option.toJSON());
    return this;
  }

  public toJSON(): Partial<ApplicationCommand> {
    return {
      name: this.name,
      description: this.description,
      type: ApplicationCommandTypes.ChatInput,
      options: this.options,
      default_member_permissions: this.default_member_permissions,
      dm_permission: this.dm_permission,
      nsfw: this.nsfw
    };
  }
}

abstract class SlashCommandOptionBase {
  public name = "";
  public description = "";
  public required = false;

  public setName(name: string): this {
    this.name = name;
    return this;
  }

  public setDescription(description: string): this {
    this.description = description;
    return this;
  }

  public setRequired(required: boolean): this {
    this.required = required;
    return this;
  }

  abstract toJSON(): ApplicationCommandOption;
}

export class SlashCommandStringOption extends SlashCommandOptionBase {
  public choices?: { name: string; value: string }[];
  public min_length?: number;
  public max_length?: number;
  public autocomplete?: boolean;

  public addChoices(...choices: { name: string; value: string }[]): this {
    this.choices ??= [];
    this.choices.push(...choices);
    return this;
  }

  public setAutocomplete(autocomplete: boolean): this {
    this.autocomplete = autocomplete;
    return this;
  }

  public toJSON(): ApplicationCommandOption {
    return {
      type: ApplicationCommandOptionTypes.String,
      name: this.name,
      description: this.description,
      required: this.required,
      choices: this.choices,
      min_length: this.min_length,
      max_length: this.max_length,
      autocomplete: this.autocomplete
    } as ApplicationCommandOption;
  }
}

export class SlashCommandIntegerOption extends SlashCommandOptionBase {
  public choices?: { name: string; value: number }[];
  public min_value?: number;
  public max_value?: number;
  public autocomplete?: boolean;

  public addChoices(...choices: { name: string; value: number }[]): this {
    this.choices ??= [];
    this.choices.push(...choices);
    return this;
  }

  public toJSON(): ApplicationCommandOption {
    return {
      type: ApplicationCommandOptionTypes.Integer,
      name: this.name,
      description: this.description,
      required: this.required,
      choices: this.choices,
      min_value: this.min_value,
      max_value: this.max_value,
      autocomplete: this.autocomplete
    } as ApplicationCommandOption;
  }
}

export class SlashCommandBooleanOption extends SlashCommandOptionBase {
  public toJSON(): ApplicationCommandOption {
    return {
      type: ApplicationCommandOptionTypes.Boolean,
      name: this.name,
      description: this.description,
      required: this.required
    } as ApplicationCommandOption;
  }
}

export class SlashCommandUserOption extends SlashCommandOptionBase {
  public toJSON(): ApplicationCommandOption {
    return {
      type: ApplicationCommandOptionTypes.User,
      name: this.name,
      description: this.description,
      required: this.required
    } as ApplicationCommandOption;
  }
}

export class SlashCommandChannelOption extends SlashCommandOptionBase {
  public channel_types?: number[];

  public setChannelTypes(...types: number[]): this {
    this.channel_types = types;
    return this;
  }

  public toJSON(): ApplicationCommandOption {
    return {
      type: ApplicationCommandOptionTypes.Channel,
      name: this.name,
      description: this.description,
      required: this.required,
      channel_types: this.channel_types
    } as ApplicationCommandOption;
  }
}

export class SlashCommandRoleOption extends SlashCommandOptionBase {
  public toJSON(): ApplicationCommandOption {
    return {
      type: ApplicationCommandOptionTypes.Role,
      name: this.name,
      description: this.description,
      required: this.required
    } as ApplicationCommandOption;
  }
}
