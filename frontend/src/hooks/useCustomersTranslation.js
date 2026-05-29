import { useLang } from "../context/LanguageContext";
import { customersTranslations } from "../i18n/customers";

export function useCustomersTranslation() {
  const { lang } = useLang();
  return customersTranslations[lang] || customersTranslations.en;
}
