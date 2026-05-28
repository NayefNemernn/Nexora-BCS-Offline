import { useLang } from "../context/LanguageContext";
import { usersTranslations } from "../i18n/users";
export function useUsersTranslation() {
  const { lang } = useLang();
  return usersTranslations[lang];
}