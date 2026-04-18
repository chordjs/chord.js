import { 
  InteractionTypes, 
  ComponentTypes,
  type InteractionType,
  type ComponentType,
  type Interaction as APIInteraction, 
  type Snowflake, 
  type Message as APIMessage,
  type APIInteractionResponseCallbackData,
  type APIModalInteractionResponseCallbackData
} from "@chordjs/types";
import { BaseEntity } from "./entity.js";
import type { ChordClient } from "./chord-client.js";
import { User } from "./user.js";
import { Member } from "./member.js";
import { Message } from "./message.js";

export interface InteractionReplyOptions extends APIInteractionResponseCallbackData {
  ephemeral?: boolean;
}

/**
 * Represents a Discord Interaction. (Base Class)
 */
export class Interaction extends BaseEntity {
  public readonly id: Snowflake;
  public readonly applicationId: Snowflake;
  public readonly type: InteractionType;
  public readonly token: string;
  public readonly guildId?: Snowflake;
  public readonly channelId?: Snowflake;
  public readonly user: User;
  public readonly member?: Member;
  public readonly message?: Message;

  public constructor(client: ChordClient, data: APIInteraction) {
    super(client);
    this.id = data.id;
    this.applicationId = data.application_id!;
    this.type = data.type;
    this.token = data.token!;
    this.guildId = data.guild_id;
    this.channelId = data.channel_id;
    
    if (data.member) {
      this.member = new Member(client, this.guildId!, data.member);
      this.user = this.member.user!;
    } else if (data.user) {
      this.user = new User(client, data.user);
    } else {
      this.user = new User(client, { id: "0", username: "Unknown" } as any);
    }

    if (data.message) {
      this.message = new Message(client, data.message);
    }
  }

  /**
   * Factory method to create the appropriate interaction subclass.
   */
  public static from(client: ChordClient, data: APIInteraction): Interaction {
    switch (data.type) {
      case InteractionTypes.ApplicationCommand:
        return new CommandInteraction(client, data as any);
      case InteractionTypes.MessageComponent:
        return new ComponentInteraction(client, data as any);
      case InteractionTypes.ApplicationCommandAutocomplete:
        return new AutocompleteInteraction(client, data as any);
      case InteractionTypes.ModalSubmit:
        return new ModalSubmitInteraction(client, data as any);
      default:
        return new Interaction(client, data);
    }
  }

  public isCommand(): this is CommandInteraction {
    return this.type === InteractionTypes.ApplicationCommand;
  }

  public isComponent(): this is ComponentInteraction {
    return this.type === InteractionTypes.MessageComponent;
  }

  public isAutocomplete(): this is AutocompleteInteraction {
    return this.type === InteractionTypes.ApplicationCommandAutocomplete;
  }

  public isModalSubmit(): this is ModalSubmitInteraction {
    return this.type === InteractionTypes.ModalSubmit;
  }

  /**
   * Replies to the interaction.
   */
  public async reply(options: string | InteractionReplyOptions): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body: InteractionReplyOptions = typeof options === "string" ? { content: options } : options;
    const flags = body.ephemeral ? (body.flags ?? 0) | (1 << 6) : body.flags;
    
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
      body: JSON.stringify({
        type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
        data: { ...body, flags }
      })
    });
  }

  /**
   * Defers the reply.
   */
  public async deferReply(options?: { ephemeral?: boolean }): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const flags = options?.ephemeral ? 1 << 6 : 0;
    
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
      body: JSON.stringify({
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data: { flags }
      })
    });
  }

  /**
   * Edits the original reply.
   */
  public async editReply(options: string | InteractionReplyOptions): Promise<Message> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body: InteractionReplyOptions = typeof options === "string" ? { content: options } : options;
    const flags = body.ephemeral ? (body.flags ?? 0) | (1 << 6) : body.flags;
    
    const data = await this.client.rest.patch(`/webhooks/${this.applicationId}/${this.token}/messages/@original`, {
      body: JSON.stringify({ ...body, flags })
    }) as any;
    return new Message(this.client, data);
  }

  /**
   * Sends a follow-up message.
   */
  public async followUp(options: string | InteractionReplyOptions): Promise<Message> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body: InteractionReplyOptions = typeof options === "string" ? { content: options } : options;
    const flags = body.ephemeral ? (body.flags ?? 0) | (1 << 6) : body.flags;

    const data = await this.client.rest.post(`/webhooks/${this.applicationId}/${this.token}`, {
      body: JSON.stringify({ ...body, flags })
    }) as any;
    return new Message(this.client, data);
  }

  /**
   * Shows a modal.
   */
  public async showModal(options: APIModalInteractionResponseCallbackData): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
      body: JSON.stringify({
        type: 9, // MODAL
        data: options
      })
    });
  }

  public toJSON(): APIInteraction {
    return {
      id: this.id,
      application_id: this.applicationId,
      type: this.type,
      token: this.token,
      guild_id: this.guildId,
      channel_id: this.channelId,
      user: this.member ? undefined : this.user.toJSON(),
      member: this.member?.toJSON(),
      message: this.message?.toJSON()
    } as APIInteraction;
  }
}

/**
 * Represents an Application Command Interaction.
 */
export class CommandInteraction extends Interaction {
  public readonly commandName: string;
  public readonly commandId: Snowflake;

  public constructor(client: ChordClient, data: APIInteraction) {
    super(client, data);
    const commandData = data.data as any;
    this.commandName = commandData.name;
    this.commandId = commandData.id;
    this.commandType = commandData.type ?? 1; // Default to CHAT_INPUT
  }

  public readonly commandType: number;
}

/**
 * Represents a Message Component Interaction.
 */
export class ComponentInteraction extends Interaction {
  public readonly customId: string;
  public readonly componentType: ComponentType;
  public readonly values?: string[];

  public constructor(client: ChordClient, data: APIInteraction) {
    super(client, data);
    const componentData = data.data as any;
    this.customId = componentData.custom_id;
    this.componentType = componentData.component_type;
    this.values = componentData.values;
  }

  /**
   * Updates the original message.
   */
  public async update(options: string | InteractionReplyOptions): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    const body = typeof options === "string" ? { content: options } : options;
    
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
      body: JSON.stringify({
        type: 7, // UPDATE_MESSAGE
        data: body
      })
    });
  }

  /**
   * Defers the update of the original message.
   */
  public async deferUpdate(): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
      body: JSON.stringify({
        type: 6 // DEFERRED_UPDATE_MESSAGE
      })
    });
  }
}

/**
 * Represents an Autocomplete Interaction.
 */
export class AutocompleteInteraction extends Interaction {
  public readonly commandName: string;
  public readonly commandId: Snowflake;

  public constructor(client: ChordClient, data: APIInteraction) {
    super(client, data);
    const commandData = data.data as any;
    this.commandName = commandData.name;
    this.commandId = commandData.id;
  }

  /**
   * Responds to the autocomplete request with choices.
   */
  public async respond(choices: Array<{ name: string; value: string | number }>): Promise<void> {
    if (!this.client.rest) throw new Error("REST client is not initialized.");
    await this.client.rest.post(`/interactions/${this.id}/${this.token}/callback`, {
      body: JSON.stringify({
        type: 8, // APPLICATION_COMMAND_AUTOCOMPLETE_RESULT
        data: { choices }
      })
    });
  }
}

/**
 * Represents a Modal Submit Interaction.
 */
export class ModalSubmitInteraction extends Interaction {
  public readonly customId: string;
  private readonly _fields = new Map<string, { value: string; type: ComponentType }>();

  public constructor(client: ChordClient, data: APIInteraction) {
    super(client, data);
    const modalData = data.data as any;
    this.customId = modalData.custom_id;

    if (modalData.components) {
      for (const row of modalData.components) {
        for (const field of row.components) {
          this._fields.set(field.custom_id, {
            value: field.value,
            type: field.type
          });
        }
      }
    }
  }

  /**
   * Gets a field value by its custom ID.
   */
  public getFieldValue(customId: string): string | undefined {
    return this._fields.get(customId)?.value;
  }

  /**
   * Gets all fields as a plain object.
   */
  public get fields(): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const [key, field] of this._fields) {
      obj[key] = field.value;
    }
    return obj;
  }
}

