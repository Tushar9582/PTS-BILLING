import { useTranslation } from 'react-i18next';

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const languages = {
    en: 'English',
    hi: 'हिंदी',
    mr: 'मराठी'
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
    // Force a re-render by reloading the page to apply language changes globally
    window.location.reload();
  };

  return (
    <select
      value={i18n.language}
      onChange={(e) => changeLanguage(e.target.value)}
      className="border p-2 rounded dark:bg-gray-800 dark:text-white dark:border-gray-600"
    >
      {Object.entries(languages).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
};