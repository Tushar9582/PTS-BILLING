import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Supported languages with display names
const SUPPORTED_LANGUAGES = {
  en: 'English',
  hi: 'हिन्दी',
  fr: 'Français',
  mr: 'मराठी',
  // Add more languages as needed
};

// All namespaces used in the application
const APP_NAMESPACES = [
  'common',
  'dashboard',
  'pos',
  'products',
  'productform',
  'auth',
  'settings',
  'reports',
  'customers',
  'barcode'
];

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Basic configuration
    fallbackLng: 'en',
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
    ns: APP_NAMESPACES,
    defaultNS: 'common',
    load: 'languageOnly', // Only load language without region (en-US → en)

    // Backend configuration
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
      addPath: '/locales/add/{{lng}}/{{ns}}', // Path for missing translations
      allowMultiLoading: false,
    },

    // Detection configuration
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      lookupLocalStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      caches: ['localStorage'],
      excludeCacheFor: ['cimode'], // languages to not persist
    },

    // React configuration
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p'],
    },

    // Optimization
    partialBundledLanguages: true,
    keySeparator: false, // Disable dots in keys (e.g., "common:button")
    nsSeparator: false,

    // Debugging
    debug: process.env.NODE_ENV === 'development',
    saveMissing: process.env.NODE_ENV === 'development', // Send missing translations to backend
    saveMissingTo: 'current', // Save missing to current language

    // Interpolation
    interpolation: {
      escapeValue: false,
      format: (value, format, lng) => {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'currency') {
          return new Intl.NumberFormat(lng, {
            style: 'currency',
            currency: 'USD'
          }).format(value);
        }
        return value;
      }
    },

    // Language data
    resources: {
      en: {
        translation: {
          languageName: 'English',
          languageNativeName: 'English'
        }
      },
      hi: {
        translation: {
          languageName: 'Hindi',
          languageNativeName: 'हिन्दी'
        }
      },
      fr: {
        translation: {
          languageName: 'French',
          languageNativeName: 'Français'
        }
      },
      mr: {
        translation: {
          languageName: 'Marathi',
          languageNativeName: 'मराठी'
        }
      }
    }
  });

// Helper function to change language
export const changeLanguage = (lng: string) => {
  return i18n.changeLanguage(lng);
};

// Get current language
export const getCurrentLanguage = () => {
  return i18n.language;
};

// Get supported languages
export const getSupportedLanguages = () => {
  return SUPPORTED_LANGUAGES;
};

export default i18n;