'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Language = 'en' | 'fr';
const LanguageContext = createContext({ language: 'en' as Language, setLanguage: (_: Language) => {}, t: (en: string, _fr: string) => en });
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, updateLanguage] = useState<Language>('en');
  useEffect(() => {
    try { const saved = localStorage.getItem('portfolio-language'); if (saved === 'fr' || saved === 'en') updateLanguage(saved); } catch { /* Storage may be unavailable in private browsing. */ }
    const sync = (event: StorageEvent) => { if (event.key === 'portfolio-language') updateLanguage(event.newValue === 'fr' ? 'fr' : 'en'); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (next: Language) => { updateLanguage(next); try { localStorage.setItem('portfolio-language', next); } catch { /* The selection still applies to this page. */ } };
  return <LanguageContext.Provider value={{ language, setLanguage, t: (en, fr) => language === 'fr' ? fr : en }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  return <div className="language-switch" role="group" aria-label="Language / Langue">{(['en','fr'] as const).map(locale => <button key={locale} type="button" lang={locale} aria-label={locale === 'en' ? 'English' : 'Français'} aria-pressed={language === locale} onClick={() => setLanguage(locale)}>{locale.toUpperCase()}</button>)}</div>;
}
