import { useLang } from "../context/LanguageContext";
import { productsTranslations } from "../i18n/products";
import { useMemo } from "react";

export function useProductsTranslation(){

  const { lang } = useLang();

  const t = useMemo(() => {
    return productsTranslations[lang] || productsTranslations.en;
  }, [lang]);

  return t;

}