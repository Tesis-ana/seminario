import React, { createContext, useContext, useState, ReactNode } from 'react';
import { translations, TranslationKeys } from './translations';

type Language = 'es' | 'en';

interface LanguageContextType {
    language: Language;
    changeLanguage: (lang: Language) => void;
    t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
    undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>('es');

    const changeLanguage = (lang: Language) => {
        setLanguage(lang);
        // TODO: Persist to SecureStore if needed
        // await SecureStore.setItemAsync('language', lang);
    };

    const value: LanguageContextType = {
        language,
        changeLanguage,
        t: translations[language],
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage(): LanguageContextType {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
