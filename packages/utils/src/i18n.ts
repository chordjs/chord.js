export type TranslationMap = Record<string, string | Record<string, any>>;

export interface I18nOptions {
  defaultLocale: string;
  fallbackLocale?: string;
}

/**
 * Basic Internationalization manager.
 */
export class I18n {
  private readonly locales = new Map<string, TranslationMap>();
  private defaultLocale: string;
  private fallbackLocale: string;

  constructor(options: I18nOptions) {
    this.defaultLocale = options.defaultLocale;
    this.fallbackLocale = options.fallbackLocale ?? options.defaultLocale;
  }

  public load(locale: string, translations: TranslationMap): void {
    this.locales.set(locale, translations);
  }

  public t(key: string, args: Record<string, any> = {}, locale: string = this.defaultLocale): string {
    let template = this.resolve(key, locale) || this.resolve(key, this.fallbackLocale) || key;

    if (typeof template !== 'string') return key;

    return template.replace(/\{(\w+)\}/g, (_, k) => String(args[k] ?? `{${k}}`));
  }

  private resolve(key: string, locale: string): string | null {
    const map = this.locales.get(locale);
    if (!map) return null;

    const parts = key.split('.');
    let current: any = map;

    for (const part of parts) {
      if (current[part] === undefined) return null;
      current = current[part];
    }

    return typeof current === 'string' ? current : null;
  }
}
