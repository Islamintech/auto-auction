/**
 * Homepage slider: popular everyday Korean cars our buyers ask for (not supercars).
 *
 * Photos live in public/hero/<id>.webp (2400 px), <id>-1280.webp and
 * <id>-phone.webp (portrait). They are the brands' official key visuals:
 * Hyundai from hyundai.com/kr (/contents/repn-car/key-visual/homepage/...),
 * Kia from kia.com/kr (main-kv-contents), taken 2026-11-19 (Hyundai) and
 * via the HM Group site (Santa Fe, Kia; 2026-11-18).
 * ⚠ Brand-owned photos: get Hyundai/Kia's OK or replace them before a big launch.
 *
 * Taglines are in the i18n files under hero.slides.<model>.
 */
export interface HeroSlide {
  id: string;
  brand: "Hyundai" | "Kia";
  model: string;
  /** i18n key under hero.slides. Also the ?model= value on the car list. */
  key: ModelKey;
  /** Where the car sits in the wide photo (object-position), so narrow screens keep it in frame. */
  focus?: string;
}

/**
 * Words that identify each model in a car's title or model field. Titles come
 * in English from the bot ("Hyundai Avante 1.6 Hybrid") or as typed by admins,
 * and older imports may still carry the Korean name.
 */
export const MODEL_TERMS = {
  sonata: ["sonata", "쏘나타"],
  avante: ["avante", "elantra", "아반떼"],
  tucson: ["tucson", "투싼"],
  santafe: ["santa fe", "santafe", "싼타페"],
  sportage: ["sportage", "스포티지"],
  sorento: ["sorento", "쏘렌토"],
  carnival: ["carnival", "카니발"],
} as const;

export type ModelKey = keyof typeof MODEL_TERMS;

export const isModelKey = (v: string | null | undefined): v is ModelKey =>
  !!v && Object.prototype.hasOwnProperty.call(MODEL_TERMS, v);

/** Does this car belong to the model? Case-insensitive match on title + model. */
export const carMatchesModel = (car: { title?: string; model?: string }, key: ModelKey): boolean => {
  const hay = `${car.title ?? ""} ${car.model ?? ""}`.toLowerCase();
  return MODEL_TERMS[key].some((term) => hay.includes(term));
};

export const HERO_SLIDES: HeroSlide[] = [
  { id: "hyundai-sonata", brand: "Hyundai", model: "Sonata", key: "sonata", focus: "56% 50%" },
  { id: "kia-sportage", brand: "Kia", model: "Sportage", key: "sportage" },
  { id: "hyundai-tucson", brand: "Hyundai", model: "Tucson", key: "tucson", focus: "45% 50%" },
  { id: "kia-sorento", brand: "Kia", model: "Sorento", key: "sorento" },
  { id: "hyundai-avante", brand: "Hyundai", model: "Avante", key: "avante", focus: "52% 50%" },
  { id: "hyundai-santafe", brand: "Hyundai", model: "Santa Fe", key: "santafe" },
  { id: "kia-carnival", brand: "Kia", model: "Carnival", key: "carnival" },
];
