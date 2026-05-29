import { useLang } from "../context/LanguageContext";
import { superAdminTranslations } from "../i18n/superAdmin";

export function useSuperAdminTranslation() {
  const { lang } = useLang();
  return superAdminTranslations[lang] || superAdminTranslations.en;
}
