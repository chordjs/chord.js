export interface PreconditionResult {
  ok: boolean;
  reason?: string;
}

export const Precondition = {
  pass(): PreconditionResult {
    return { ok: true };
  },
  fail(reason?: string): PreconditionResult {
    return { ok: false, reason };
  }
};

export interface RouterHooks<TContext> {
  beforeRun?(context: TContext): void | Promise<void>;
  afterRun?(context: TContext): void | Promise<void>;
  onError?(context: TContext, error: unknown): void | Promise<void>;
}

export type PreconditionCheck<TContext> = (context: TContext) => PreconditionResult | Promise<PreconditionResult>;

export async function runPreconditions<TContext>(
  checks: Array<PreconditionCheck<TContext>>,
  context: TContext
): Promise<PreconditionResult> {
  for (const check of checks) {
    const result = await check(context);
    if (!result.ok) return result;
  }
  return Precondition.pass();
}

export interface GuildOnlyContext {
  guildId?: string;
  message?: { guild_id?: string; guildId?: string };
}

export function guildOnly<TContext extends GuildOnlyContext>(
  reason = "This command can only be used in guilds."
): PreconditionCheck<TContext> {
  return (context) => {
    const guildId = context.guildId ?? context.message?.guild_id ?? context.message?.guildId;
    return guildId ? Precondition.pass() : Precondition.fail(reason);
  };
}

export interface OwnerOnlyContext {
  userId?: string;
  ownerIds?: string[];
  user?: { id?: string };
  interaction?: { user?: { id?: string }; member?: { user?: { id?: string } } };
  message?: { author?: { id?: string } };
}

export interface OwnerOnlyOptions {
  ownerIds: string[];
  reason?: string;
}

export function ownerOnly<TContext extends OwnerOnlyContext>(options: OwnerOnlyOptions): PreconditionCheck<TContext> {
  return (context) => {
    const userId =
      context.userId
      ?? context.user?.id
      ?? context.interaction?.user?.id
      ?? context.interaction?.member?.user?.id
      ?? context.message?.author?.id;
    if (!userId) return Precondition.fail(options.reason ?? "Only bot owners can use this command.");
    return options.ownerIds.includes(userId)
      ? Precondition.pass()
      : Precondition.fail(options.reason ?? "Only bot owners can use this command.");
  };
}

export interface CooldownContext {
  commandName?: string;
  userId?: string;
  user?: { id?: string };
  interaction?: { user?: { id?: string }; member?: { user?: { id?: string } } };
  message?: { author?: { id?: string } };
}

export interface CooldownOptions {
  ttlMs: number;
  key?: (context: CooldownContext) => string | null | undefined;
  reason?: (remainingMs: number) => string;
}

export function cooldown(options: CooldownOptions): PreconditionCheck<CooldownContext> {
  const cache = new Map<string, number>();
  const reason = options.reason ?? ((remainingMs: number) => `Cooldown active. Retry in ${Math.ceil(remainingMs / 1000)}s.`);

  return (context) => {
    const key = options.key?.(context)
      ?? `${context.commandName ?? "command"}:${
        context.userId
        ?? context.user?.id
        ?? context.interaction?.user?.id
        ?? context.interaction?.member?.user?.id
        ?? context.message?.author?.id
        ?? "anonymous"
      }`;
    if (!key) return Precondition.pass();

    const now = Date.now();
    const expiresAt = cache.get(key) ?? 0;
    if (expiresAt > now) {
      return Precondition.fail(reason(expiresAt - now));
    }

    cache.set(key, now + options.ttlMs);
    return Precondition.pass();
  };
}

export interface PermissionsContext {
  permissions?: bigint | number;
  member?: { permissions?: bigint | number | string };
  interaction?: { member?: { permissions?: bigint | number | string } };
  message?: { member?: { permissions?: bigint | number | string } };
}

export interface PermissionsOptions {
  required: bigint | number;
  reason?: string;
}

export function hasPermissions<TContext extends PermissionsContext>(options: PermissionsOptions): PreconditionCheck<TContext> {
  return (context) => {
    const source =
      context.permissions
      ?? context.member?.permissions
      ?? context.interaction?.member?.permissions
      ?? context.message?.member?.permissions;
    if (source === undefined || source === null) {
      return Precondition.fail(options.reason ?? "Missing required permissions.");
    }

    const current = typeof source === "string" ? BigInt(source) : BigInt(source);
    const required = BigInt(options.required);
    const has = (current & required) === required;
    return has ? Precondition.pass() : Precondition.fail(options.reason ?? "Missing required permissions.");
  };
}
