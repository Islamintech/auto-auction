import i18n, { baseLang } from "../i18n";

/**
 * BCP-47 tags for Intl. Arabic is pinned to Latin digits (-u-nu-latn) so that
 * prices, mileage and years stay readable next to the Latin-script car data.
 */
const INTL_LOCALES: Record<string, string> = {
  en: "en-US",
  ru: "ru-RU",
  ko: "ko-KR",
  ar: "ar-u-nu-latn",
};

export const intlLocale = () => INTL_LOCALES[baseLang(i18n.language)] ?? "en-US";

export const formatNumber = (n: number) => n.toLocaleString(intlLocale());

export const formatDate = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions
) => new Date(value).toLocaleDateString(intlLocale(), options);

export const formatDateTime = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions
) => new Date(value).toLocaleString(intlLocale(), options);
