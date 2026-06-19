import { useState, useEffect } from "react";
import { I18nService, Locale } from "../services/I18nService";
import { en } from "../locales/en";
import { es } from "../locales/es";

const translations = { en, es };

/**
 * Hook to access translations and locale management.
 */
export function useTranslation() {
  const [locale, setLocale] = useState<Locale>(I18nService.getLocale());

  useEffect(() => {
    return I18nService.subscribe(setLocale);
  }, []);

  const t = translations[locale];

  return {
    t,
    locale,
    toggleLanguage: () => I18nService.toggleLocale(),
    setLanguage: (l: Locale) => I18nService.setLocale(l),
  };
}
