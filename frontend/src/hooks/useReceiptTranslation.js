import { useLang } from "../context/LanguageContext";
import { receiptTranslations } from "../i18n/receipt";

export function useReceiptTranslation() {
  const { lang } = useLang();
  return receiptTranslations[lang] || receiptTranslations.en;
}
