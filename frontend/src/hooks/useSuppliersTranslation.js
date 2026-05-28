import { useLang } from "../context/LanguageContext";
import { suppliersTranslations } from "../i18n/suppliers";

export function useSuppliersTranslation() {
  const { lang } = useLang();
  return suppliersTranslations[lang] || suppliersTranslations.en;
}
