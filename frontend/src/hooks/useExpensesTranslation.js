import { useLang } from "../context/LanguageContext";
import { expensesTranslations } from "../i18n/expenses";

export function useExpensesTranslation() {
  const { lang } = useLang();
  return expensesTranslations[lang] || expensesTranslations.en;
}
