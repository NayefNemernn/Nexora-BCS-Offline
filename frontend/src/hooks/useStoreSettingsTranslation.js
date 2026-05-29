import { useLang } from "../context/LanguageContext";
import { storeSettingsTranslations } from "../i18n/storeSettings";

export function useStoreSettingsTranslation() {
  const { lang } = useLang();
  return storeSettingsTranslations[lang] || storeSettingsTranslations.en;
}
