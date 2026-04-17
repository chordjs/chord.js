export interface ApplicationRoleConnectionMetadata {
  type: number;
  key: string;
  name: string;
  name_localizations?: Record<string, string>;
  description: string;
  description_localizations?: Record<string, string>;
}
