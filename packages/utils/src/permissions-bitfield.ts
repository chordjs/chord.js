export type PermissionResolvable = string | bigint | PermissionsBitField | Array<PermissionResolvable>;

export class PermissionsBitField {
  public bitfield: bigint;

  static Flags = {
    CreateInstantInvite: 1n << 0n,
    KickMembers: 1n << 1n,
    BanMembers: 1n << 2n,
    Administrator: 1n << 3n,
    ManageChannels: 1n << 4n,
    ManageGuild: 1n << 5n,
    AddReactions: 1n << 6n,
    ViewAuditLog: 1n << 7n,
    PrioritySpeaker: 1n << 8n,
    Stream: 1n << 9n,
    ViewChannel: 1n << 10n,
    SendMessages: 1n << 11n,
    SendTTSMessages: 1n << 12n,
    ManageMessages: 1n << 13n,
    EmbedLinks: 1n << 14n,
    AttachFiles: 1n << 15n,
    ReadMessageHistory: 1n << 16n,
    MentionEveryone: 1n << 17n,
    UseExternalEmojis: 1n << 18n,
    ViewGuildInsights: 1n << 19n,
    Connect: 1n << 20n,
    Speak: 1n << 21n,
    MuteMembers: 1n << 22n,
    DeafenMembers: 1n << 23n,
    MoveMembers: 1n << 24n,
    UseVAD: 1n << 25n,
    ChangeNickname: 1n << 26n,
    ManageNicknames: 1n << 27n,
    ManageRoles: 1n << 28n,
    ManageWebhooks: 1n << 29n,
    ManageEmojisAndStickers: 1n << 30n,
    UseApplicationCommands: 1n << 31n,
    RequestToSpeak: 1n << 32n,
    ManageEvents: 1n << 33n,
    ManageThreads: 1n << 34n,
    CreatePublicThreads: 1n << 35n,
    CreatePrivateThreads: 1n << 36n,
    UseExternalStickers: 1n << 37n,
    SendMessagesInThreads: 1n << 38n,
    UseEmbeddedActivities: 1n << 39n,
    ModerateMembers: 1n << 40n,
    ViewCreatorMonetizationAnalytics: 1n << 41n,
    UseSoundboard: 1n << 42n,
    CreateGuildExpressions: 1n << 43n,
    CreateEvents: 1n << 44n,
    UseExternalSounds: 1n << 45n,
    SendVoiceMessages: 1n << 46n,
    SendPolls: 1n << 49n,
    UseExternalApps: 1n << 50n
  } as const;

  constructor(bits: PermissionResolvable = 0n) {
    this.bitfield = PermissionsBitField.resolve(bits);
  }

  has(permission: PermissionResolvable, checkAdmin = true): boolean {
    const bit = PermissionsBitField.resolve(permission);
    if (checkAdmin && (this.bitfield & PermissionsBitField.Flags.Administrator) === PermissionsBitField.Flags.Administrator) {
      return true;
    }
    return (this.bitfield & bit) === bit;
  }

  add(...bits: PermissionResolvable[]): this {
    let total = 0n;
    for (const bit of bits) {
      total |= PermissionsBitField.resolve(bit);
    }
    this.bitfield |= total;
    return this;
  }

  remove(...bits: PermissionResolvable[]): this {
    let total = 0n;
    for (const bit of bits) {
      total |= PermissionsBitField.resolve(bit);
    }
    this.bitfield &= ~total;
    return this;
  }

  toArray(): Array<keyof typeof PermissionsBitField.Flags> {
    const result: Array<keyof typeof PermissionsBitField.Flags> = [];
    for (const [name, flag] of Object.entries(PermissionsBitField.Flags)) {
      if ((this.bitfield & flag) === flag) {
        result.push(name as keyof typeof PermissionsBitField.Flags);
      }
    }
    return result;
  }

  static resolve(permission: PermissionResolvable): bigint {
    if (typeof permission === "bigint") return permission;
    if (typeof permission === "string") {
      if (permission in PermissionsBitField.Flags) {
        return PermissionsBitField.Flags[permission as keyof typeof PermissionsBitField.Flags];
      }
      return BigInt(permission);
    }
    if (permission instanceof PermissionsBitField) return permission.bitfield;
    if (Array.isArray(permission)) {
      return permission.reduce<bigint>((acc, p) => acc | this.resolve(p), 0n);
    }
    throw new TypeError(`Cannot resolve permission: ${permission}`);
  }
}
