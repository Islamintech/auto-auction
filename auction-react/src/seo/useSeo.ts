import { useEffect } from "react";
import SEO from "./pages.json";

/**
 * Keeps <title>, description and canonical in step with in-app navigation.
 *
 * The first load already has the right tags: the web server (server/index.js)
 * writes them, from the same pages.json, before sending the page. This hook
 * only updates them when the user moves between pages without a reload.
 */
type PageKey = keyof typeof SEO.pages;

interface SeoInput {
  title: string;
  description?: string;
  /** Path for the canonical URL, e.g. "/products/123". */
  path?: string;
  noindex?: boolean;
}

const setMeta = (selector: string, attr: "name" | "property", key: string, value: string | null) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (value === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.setAttribute("data-seo", "");
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
};

export function useSeo(input: SeoInput | null) {
  const { title, description, path, noindex } = input ?? ({} as SeoInput);
  useEffect(() => {
    if (!title) return;
    document.title = title;
    if (description) {
      setMeta('meta[name="description"]', "name", "description", description);
      setMeta('meta[property="og:description"]', "property", "og:description", description);
    }
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[name="robots"]', "name", "robots", noindex ? "noindex, nofollow" : null);
    if (path) {
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = window.location.origin + path;
    }
  }, [title, description, path, noindex]);
}

/** For pages whose text is fixed (pages.json). */
export function usePageSeo(key: PageKey) {
  const page = SEO.pages[key] as { title: string; description: string; noindex?: boolean };
  useSeo({ title: page.title, description: page.description, path: key, noindex: page.noindex });
}

const FUEL: Record<string, string> = { PETROL: "Petrol", DIESEL: "Diesel", HYBRID: "Hybrid", ELECTRIC: "Electric", LPG: "LPG" };

/** Same wording as carMeta() in server/meta.js. */
export function carSeo(car: { id: string; title?: string; year?: string | number; km?: string | number | null; fuel?: string; price?: string | number } | null) {
  if (!car) return null;
  const year = car.year ? String(car.year) : "";
  const name = [car.title, year && !String(car.title ?? "").includes(year) ? year : ""].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const amounts = (String(car.price ?? "").match(/\d[\d,]*/g) || [])
    .map((x) => Number(x.replace(/,/g, "")))
    .filter((n) => n > 0)
    .slice(0, 2);
  const priceText = amounts.length ? "₩" + amounts.map((n) => n.toLocaleString("en-US")).join("–") : "";
  const km = /^\d[\d,]*$/.test(String(car.km ?? "")) ? `${Number(String(car.km).replace(/,/g, "")).toLocaleString("en-US")} km` : "";
  const facts = [year, km, car.fuel ? FUEL[car.fuel] : ""].filter(Boolean).join(" · ");
  return {
    title: `${name} — ${priceText ? priceText + " | " : ""}${SEO.siteName}`,
    description: [`${name} from Korea.`, facts && `${facts}.`, priceText && `Price ${priceText}.`].filter(Boolean).join(" "),
    path: `/products/${car.id}`,
  };
}
