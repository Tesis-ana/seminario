import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [language, setLanguage] = useState('es');

    useEffect(() => {
        // Load language from localStorage on mount
        const savedLanguage = localStorage.getItem('language');
        if (
            savedLanguage &&
            (savedLanguage === 'es' || savedLanguage === 'en')
        ) {
            setLanguage(savedLanguage);
        }
    }, []);

    const changeLanguage = (lang) => {
        if (lang === 'es' || lang === 'en') {
            setLanguage(lang);
            localStorage.setItem('language', lang);
        }
    };

    const t = translations[language];

    return (
        <LanguageContext.Provider value={{ language, changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
