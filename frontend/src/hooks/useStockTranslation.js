import { useLang } from "../context/LanguageContext";
import { stockTranslations } from "../i18n/stock";

export function useStockTranslation() {
  const { lang } = useLang();
  return stockTranslations[lang] || stockTranslations.en;
}
