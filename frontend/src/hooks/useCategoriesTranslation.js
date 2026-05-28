import { useLang } from "../context/LanguageContext";
import { categoriesTranslations } from "../i18n/categories";

export function useCategoriesTranslation(){

  const { lang } = useLang();

  return categoriesTranslations[lang];

}