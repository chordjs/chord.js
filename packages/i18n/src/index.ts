/**
 * @chordjs/i18n — Internationalization and localization module
 *
 * Features:
 * - Locale management and string interpolation
 * - Pluralization support
 * - Fallback mechanisms
 * - Type-safe key resolution
 */

export interface I18nOptions {
  defaultLocale?: string;
  fallbackLocale?: string;
}

export type TranslationValue = string | number | boolean | null | undefined;
export type InterpolationMap = Record<string, TranslationValue>;
export type LanguageMap = Record<string, string>;

export class I18nManager {
  public defaultLocale: string;
  public fallbackLocale: string;
  
  // locale -> (key -> translated string)
  private readonly locales = new Map<string, LanguageMap>();

  constructor(options: I18nOptions = {}) {
    this.defaultLocale = options.defaultLocale ?? "en-US";
    this.fallbackLocale = options.fallbackLocale ?? "en-US";
  }

  /**
   * Register a full language map for a specific locale.
   */
  public loadLocale(locale: string, translations: LanguageMap): void {
    const existing = this.locales.get(locale) ?? {};
    this.locales.set(locale, { ...existing, ...translations });
  }

  /**
   * Get the translated string for a given key, interpolating variables if provided.
   */
  public t(key: string, locale?: string, variables?: InterpolationMap): string {
    const targetLocale = locale ?? this.defaultLocale;
    let template = this.#resolveTemplate(key, targetLocale);

    if (template === null && targetLocale !== this.fallbackLocale) {
      template = this.#resolveTemplate(key, this.fallbackLocale);
    }

    if (template === null) {
      return key; // Fallback to returning the key itself if no translation is found
    }

    if (variables) {
      return this.#interpolate(template, variables);
    }

    return template;
  }

  #resolveTemplate(key: string, locale: string): string | null {
    const map = this.locales.get(locale);
    if (!map) return null;
    
    // Support nested keys like "commands.ping.description" if maps are flattened
    return map[key] ?? null;
  }

  #interpolate(template: string, variables: InterpolationMap): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined && value !== null ? String(value) : match;
    });
  }
}
