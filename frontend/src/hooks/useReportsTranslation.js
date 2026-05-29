import { useLang } from "../context/LanguageContext";
import { reportsTranslations } from "../i18n/reports";

export function useReportsTranslation(){

  const { lang } = useLang();

  return reportsTranslations[lang];

}