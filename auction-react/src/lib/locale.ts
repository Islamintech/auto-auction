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

/**
 * Mileage is free text: usually a plain km number, but it can be a range or a
 * note ("2000~3000", "unknown"). Plain numbers get grouping, the rest is shown
 * as the admin typed it. `unit` is appended to numbers only.
 */
export const formatMileage = (km: string | number | null | undefined, unit = "") => {
  const raw = km == null ? "" : String(km).trim();
  if (!raw) return "—";
  const digits = raw.replace(/,/g, "");
  if (/^\d+$/.test(digits)) return `${formatNumber(Number(digits))}${unit ? ` ${unit}` : ""}`;
  return raw;
};

/** First number in a mileage value, for sorting; non-numeric values sort last. */
export const mileageValue = (km: string | number | null | undefined) => {
  const m = String(km ?? "").replace(/,/g, "").match(/\d+/);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
};

export const formatDate = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions
) => new Date(value).toLocaleDateString(intlLocale(), options);

export const formatDateTime = (
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions
) => new Date(value).toLocaleString(intlLocale(), options);
