import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type Language, getStoredLanguage, storeLanguage, translate } from '../lib/i18n';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(getStoredLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    storeLanguage(lang);
  }, []);

  const t = useCallback(
    (key: string) => translate(key, language),
    [language],
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return ctx;
}
