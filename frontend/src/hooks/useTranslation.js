import { useLang } from "../context/LanguageContext";
import { translations } from "../i18n/translations";

export function useTranslation() {

  const { lang } = useLang();

  const t = translations[lang];

  return { t, lang };

}