import "reflect-metadata";
import {
  ownerOnly,
  cooldown,
  hasPermissions,
  type PreconditionCheck
} from "@chordjs/interactions";

/**
 * Resolves a metadata-based precondition into a functional PreconditionCheck.
 */
export function resolvePrecondition(meta: any, client: any): PreconditionCheck<any> | null {
  if (meta === "OwnerOnly") {
    return ownerOnly({ ownerIds: client.ownerIds ?? [] });
  }
  if (typeof meta === "object" && meta.type === "Permissions") {
    // Basic mapping for permissions - in a real app, this should map to Permission bitfields
    // For now, we simulate a simple reduction. 
    // Ideally, we'd use a Permissions bitfield utility from @chordjs/types or utils.
    const required = meta.value.reduce((acc: bigint, p: string) => {
      // Mock bitfield mapping for demo - normally you'd use a full Permission flags object
      if (p === "Administrator") return acc | (1n << 3n);
      if (p === "ManageMessages") return acc | (1n << 13n);
      return acc | 1n; 
    }, 0n);
    return hasPermissions({ required });
  }
  if (typeof meta === "object" && meta.type === "Cooldown") {
    return cooldown({ ttlMs: meta.value });
  }
  return null;
}
export const OPTIONS_METADATA_KEY = Symbol("chordjs:piece-options");
export const PRECONDITIONS_METADATA_KEY = Symbol("chordjs:piece-preconditions");
export const SUBCOMMAND_METADATA_KEY = Symbol("chordjs:piece-subcommands");
export const COMPONENT_HANDLER_METADATA_KEY = Symbol("chordjs:piece-components");

/**
 * Decorator to mark a method as a component handler.
 */
export function OnComponent(customId: string | RegExp): MethodDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const handlers = Reflect.getMetadata(COMPONENT_HANDLER_METADATA_KEY, target) ?? [];
    handlers.push({ customId, propertyKey });
    Reflect.defineMetadata(COMPONENT_HANDLER_METADATA_KEY, handlers, target);
  };
}

/**
 * Retrieves the component handlers for a Piece.
 */
export function getComponentHandlers(target: any): Array<{ customId: string | RegExp; propertyKey: string | symbol }> {
  return Reflect.getMetadata(COMPONENT_HANDLER_METADATA_KEY, target) ?? [];
}

/**
 * Decorator to mark a method as a subcommand.
 */
export function Subcommand(name?: string): MethodDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const subcommands = Reflect.getMetadata(SUBCOMMAND_METADATA_KEY, target) ?? [];
    subcommands.push({ name: name ?? propertyKey.toString(), propertyKey });
    Reflect.defineMetadata(SUBCOMMAND_METADATA_KEY, subcommands, target);
  };
}

/**
 * Retrieves the subcommands for a Piece.
 */
export function getSubcommands(target: any): Array<{ name: string; propertyKey: string | symbol }> {
  return Reflect.getMetadata(SUBCOMMAND_METADATA_KEY, target) ?? [];
}

/**
 * A decorator to apply options to a Piece class.
 */
export function ApplyOptions<T>(options: T): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(OPTIONS_METADATA_KEY, options, target);
  };
}

/**
 * Decorator to restrict a command to the bot owner.
 */
export function OwnerOnly(): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    const existing = Reflect.getMetadata(PRECONDITIONS_METADATA_KEY, target, propertyKey!) ?? [];
    Reflect.defineMetadata(PRECONDITIONS_METADATA_KEY, [...existing, "OwnerOnly"], target, propertyKey!);
  };
}

/**
 * Decorator to require specific permissions for a command.
 */
export function Permissions(permissions: string | string[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    const perms = Array.isArray(permissions) ? permissions : [permissions];
    const existing = Reflect.getMetadata(PRECONDITIONS_METADATA_KEY, target, propertyKey!) ?? [];
    Reflect.defineMetadata(PRECONDITIONS_METADATA_KEY, [...existing, { type: "Permissions", value: perms }], target, propertyKey!);
  };
}

/**
 * Decorator to apply a cooldown to a command.
 */
export function Cooldown(ms: number): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol) => {
    const existing = Reflect.getMetadata(PRECONDITIONS_METADATA_KEY, target, propertyKey!) ?? [];
    Reflect.defineMetadata(PRECONDITIONS_METADATA_KEY, [...existing, { type: "Cooldown", value: ms }], target, propertyKey!);
  };
}

/**
 * Retrieves the options applied to a Piece class via @ApplyOptions.
 */
export function getPieceOptions<T>(target: Function): T | undefined {
  return Reflect.getMetadata(OPTIONS_METADATA_KEY, target);
}

/**
 * Retrieves the preconditions applied to a Piece or method.
 */
export function getPreconditions(target: any, propertyKey?: string | symbol): any[] {
  return Reflect.getMetadata(PRECONDITIONS_METADATA_KEY, target, propertyKey!) ?? [];
}
