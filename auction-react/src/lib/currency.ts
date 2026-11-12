import { useEffect, useState } from "react";
import api from "./api";
import { formatNumber } from "./locale";

/**
 * USD/KRW exchange rate shared across the app.
 * The backend caches the Frankfurter rate for 6h; on the client we fetch it
 * once per page load and share the promise between all components.
 */
let cachedRate: number | null = null;
let pending: Promise<number | null> | null = null;

export function fetchUsdKrwRate(): Promise<number | null> {
  if (cachedRate) return Promise.resolve(cachedRate);
  if (!pending) {
    pending = api
      .get("/currency/usd-krw")
      .then((res) => {
        const rate = Number(res.data?.rate);
        if (Number.isFinite(rate) && rate > 0) {
          cachedRate = rate;
          return rate;
        }
        return null;
      })
      .catch(() => {
        pending = null; // allow a retry on the next mount
        return null;
      });
  }
  return pending;
}

/** Returns the USD/KRW rate once loaded, or null while loading / on failure. */
export function useUsdKrwRate(): number | null {
  const [rate, setRate] = useState<number | null>(cachedRate);

  useEffect(() => {
    if (rate !== null) return;
    let alive = true;
    fetchUsdKrwRate().then((r) => {
      if (alive && r) setRate(r);
    });
    return () => {
      alive = false;
    };
  }, [rate]);

  return rate;
}

/**
 * Admin enters the price in KRW, sometimes as a range ("30,000,000-35,000,000").
 * Extract up to two numeric amounts from whatever string/number is stored.
 */
export function parseKrw(price: string | number | null | undefined): number[] {
  if (typeof price === "number") {
    return Number.isFinite(price) && price > 0 ? [price] : [];
  }
  if (!price) return [];
  return (String(price).match(/\d[\d,]*/g) || [])
    .map((part) => Number(part.replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 2);
}

/** Lowest amount in a (possibly range) KRW price — used for sorting/filtering. */
export function krwValue(price: string | number | null | undefined): number {
  const amounts = parseKrw(price);
  return amounts.length ? Math.min(...amounts) : 0;
}

/** "₩30,000,000" or "₩30,000,000–35,000,000" — the admin-entered price. */
export function formatKrw(price: string | number | null | undefined): string {
  const amounts = parseKrw(price);
  if (!amounts.length) return "—";
  return "₩" + amounts.map((n) => formatNumber(n)).join("–");
}

/** "≈ $20,077" or "≈ $20,077–$23,424", null while the rate is unknown. */
export function formatUsdEstimate(
  price: string | number | null | undefined,
  rate: number | null
): string | null {
  if (!rate) return null;
  const amounts = parseKrw(price);
  if (!amounts.length) return null;
  return (
    "≈ " + amounts.map((n) => "$" + formatNumber(Math.round(n / rate))).join("–")
  );
}
