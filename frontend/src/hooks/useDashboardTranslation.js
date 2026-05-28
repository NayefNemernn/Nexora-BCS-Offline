import { useLang } from "../context/LanguageContext";
import { dashboardTranslations } from "../i18n/dashboard";

export function useDashboardTranslation(){

  const { lang } = useLang();

  return dashboardTranslations[lang];

}