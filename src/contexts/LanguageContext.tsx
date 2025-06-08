import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'vi' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Lấy ngôn ngữ từ localStorage hoặc mặc định là tiếng Việt
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage || 'vi';
  });

  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    // Lưu ngôn ngữ vào localStorage
    localStorage.setItem('language', language);
    
    // Load translations
    loadTranslations(language);
  }, [language]);

  const loadTranslations = async (lang: Language) => {
    try {
      const translationModule = await import(`../i18n/translations/${lang}.json`);
      setTranslations(translationModule.default);
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
      // Fallback to Vietnamese if English fails
      if (lang === 'en') {
        try {
          const fallbackModule = await import('../i18n/translations/vi.json');
          setTranslations(fallbackModule.default);
        } catch (fallbackError) {
          console.error('Failed to load fallback translations:', fallbackError);
        }
      }
    }
  };

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};