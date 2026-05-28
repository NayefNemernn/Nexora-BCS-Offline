import { useLang } from "../context/LanguageContext";
import { paylaterTranslations } from "../i18n/paylater";

export function usePayLaterTranslation(){

  const { lang } = useLang();

  return paylaterTranslations[lang];

}