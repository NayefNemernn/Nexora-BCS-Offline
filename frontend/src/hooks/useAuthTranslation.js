import { useLang } from "../context/LanguageContext";
import { authTranslations } from "../i18n/auth";

export function useAuthTranslation() {
  const { lang } = useLang();
  return authTranslations[lang] || authTranslations.en;
}
