import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ru from "./locales/ru.json";
import ar from "./locales/ar.json";
import ko from "./locales/ko.json";

export const SUPPORTED_LANGS = ["en", "ru", "ar", "ko"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const RTL_LANGS: Lang[] = ["ar"];
/** Tolerates regional tags such as "ar-SA" as well as the bare "ar". */
export const baseLang = (lang?: string) => (lang ?? "").split("-")[0] as Lang;
export const dirFor = (lang?: string) => (RTL_LANGS.includes(baseLang(lang)) ? "rtl" : "ltr");

const stored = (typeof window !== "undefined" && localStorage.getItem("lang")) as Lang | null;
const initialLang = SUPPORTED_LANGS.includes(stored as Lang) ? (stored as Lang) : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ru: { translation: ru },
    ar: { translation: ar },
    ko: { translation: ko },
  },
  lng: initialLang,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLang;
  document.documentElement.dir = dirFor(initialLang);
}

export default i18n;
