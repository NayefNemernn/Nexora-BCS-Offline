import { useLang } from "../context/LanguageContext";
import { shiftTranslations } from "../i18n/shift";

export function useShiftTranslation() {
  const { lang } = useLang();
  return shiftTranslations[lang] || shiftTranslations.en;
}
