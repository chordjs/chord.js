import type { GatewayDispatchDataMap, InteractionTypes } from "@chordjs/types";

export interface GatewayEventEmitter {
  onDispatch(event: string, handler: (data: any) => void | Promise<void>): unknown;
  offDispatch?(event: string, handler: (data: any) => void | Promise<void>): unknown;
}

export interface CollectorOptions<T> {
  dispatcher: GatewayEventEmitter;
  filter?: (item: T) => boolean | Promise<boolean>;
  time?: number;
  max?: number;
}

export class CollectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CollectorError";
  }
}

export async function awaitMessages(
  options: CollectorOptions<GatewayDispatchDataMap["MESSAGE_CREATE"]> & { channelId: string }
): Promise<GatewayDispatchDataMap["MESSAGE_CREATE"][]> {
  const { dispatcher, filter, time = 15000, max = 1, channelId } = options;
  const collected: GatewayDispatchDataMap["MESSAGE_CREATE"][] = [];
  
  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (dispatcher.offDispatch) {
        dispatcher.offDispatch("MESSAGE_CREATE", handler);
      }
    };

    const handler = async (message: GatewayDispatchDataMap["MESSAGE_CREATE"]) => {
      if (message.channel_id !== channelId) return;

      if (filter) {
        try {
          const pass = await filter(message);
          if (!pass) return;
        } catch (e) {
          return; // Ignore filter errors
        }
      }

      collected.push(message);
      if (max && collected.length >= max) {
        cleanup();
        resolve(collected);
      }
    };

    dispatcher.onDispatch("MESSAGE_CREATE", handler);

    if (time > 0) {
      timeout = setTimeout(() => {
        cleanup();
        if (collected.length > 0) {
          resolve(collected);
        } else {
          reject(new CollectorError("Collector timed out without receiving any matching items."));
        }
      }, time);
    }
  });
}

export async function awaitComponents(
  options: CollectorOptions<GatewayDispatchDataMap["INTERACTION_CREATE"]> & { messageId?: string, channelId?: string, componentType?: number }
): Promise<GatewayDispatchDataMap["INTERACTION_CREATE"][]> {
  const { dispatcher, filter, time = 15000, max = 1, messageId, channelId, componentType } = options;
  const collected: GatewayDispatchDataMap["INTERACTION_CREATE"][] = [];

  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (dispatcher.offDispatch) {
        dispatcher.offDispatch("INTERACTION_CREATE", handler);
      }
    };

    const handler = async (interaction: GatewayDispatchDataMap["INTERACTION_CREATE"]) => {
      // 3 = MessageComponent
      if (interaction.type !== 3) return;

      if (channelId && interaction.channel_id !== channelId) return;
      if (messageId && interaction.message?.id !== messageId) return;
      
      if (componentType) {
        const data = interaction.data as any;
        if (data?.component_type !== componentType) return;
      }

      if (filter) {
        try {
          const pass = await filter(interaction);
          if (!pass) return;
        } catch (e) {
          return;
        }
      }

      collected.push(interaction);
      if (max && collected.length >= max) {
        cleanup();
        resolve(collected);
      }
    };

    dispatcher.onDispatch("INTERACTION_CREATE", handler);

    if (time > 0) {
      timeout = setTimeout(() => {
        cleanup();
        if (collected.length > 0) {
          resolve(collected);
        } else {
          reject(new CollectorError("Collector timed out without receiving any matching components."));
        }
      }, time);
    }
  });
}
