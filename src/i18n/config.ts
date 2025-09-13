import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(Backend) // Loads translations from /locales
  .use(LanguageDetector) // Detects browser/user language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'fr', 'mr'], // Supported languages
    ns: ['common', 'dashboard', 'pos', 'products'], // Namespaces
    defaultNS: 'common', // Default namespace

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // Load structure
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    interpolation: {
      escapeValue: false, // React already handles escaping
    },

    react: {
      useSuspense: true,
    },
  });

export default i18n;
