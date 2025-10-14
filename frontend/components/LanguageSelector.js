import { useLanguage } from '../lib/LanguageContext';

export default function LanguageSelector() {
    const { language, changeLanguage } = useLanguage();

    return (
        <div
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
            }}
        >
            <button
                onClick={() => changeLanguage('es')}
                style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: language === 'es' ? '#007bff' : '#f0f0f0',
                    color: language === 'es' ? 'white' : '#333',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: language === 'es' ? 'bold' : 'normal',
                    transition: 'all 0.2s',
                }}
            >
                ES
            </button>
            <button
                onClick={() => changeLanguage('en')}
                style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: language === 'en' ? '#007bff' : '#f0f0f0',
                    color: language === 'en' ? 'white' : '#333',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: language === 'en' ? 'bold' : 'normal',
                    transition: 'all 0.2s',
                }}
            >
                EN
            </button>
        </div>
    );
}
