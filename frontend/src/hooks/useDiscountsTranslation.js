import { useLang } from "../context/LanguageContext";
import { discountsTranslations } from "../i18n/discounts";

export function useDiscountsTranslation() {
  const { lang } = useLang();
  return discountsTranslations[lang] || discountsTranslations.en;
}
