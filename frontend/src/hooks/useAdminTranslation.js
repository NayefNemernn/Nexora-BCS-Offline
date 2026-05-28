import { useLang } from "../context/LanguageContext";
import { adminTranslations } from "../i18n/admin";

export function useAdminTranslation() {
  const { lang } = useLang();
  return adminTranslations[lang] || adminTranslations.en;
}
