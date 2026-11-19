/**
 * Homepage slider: popular cars our buyers ask for - everyday Korean models plus
 * the imports and EVs that are common in our stock (BMW, Mercedes-Benz, Tesla).
 * No supercars.
 *
 * Photos live in public/hero/<id>.webp (2400 px), <id>-1280.webp and
 * <id>-phone.webp (portrait). They are the brands' official images:
 * Hyundai from hyundai.com/kr (/contents/repn-car/key-visual/homepage/...),
 * Kia from kia.com/kr (main-kv-contents; Santa Fe and Kia via the HM Group site),
 * BMW from bmw.co.kr (bmw.scene7.com stage images), Mercedes-Benz from the
 * mercedes-benz.co.uk model pages (square studio shots, widened by extending
 * their own background), Tesla from tesla.com (digitalassets Model Y hero).
 * Taken 2026-11-19.
 * ⚠ Brand-owned photos: get the brands' OK or replace them before a big launch.
 *
 * Taglines are in the i18n files under hero.slides.<key>.
 */
export interface HeroSlide {
  id: string;
  brand: "Hyundai" | "Kia" | "BMW" | "Mercedes-Benz" | "Tesla";
  model: string;
  /** i18n key under hero.slides. Also the ?model= value on the car list. */
  key: ModelKey;
  /** Where the car sits in the wide photo (object-position), so narrow screens keep it in frame. */
  focus?: string;
  /** Bright photo (white studio, pale sky): needs a stronger shade behind the white text. */
  light?: boolean;
}

/**
 * What identifies each model in a car title or model field. Titles come in
 * English from the bot ("Hyundai Avante 1.6 Hybrid") or as typed by admins, and
 * older imports may still carry the Korean name. Plain strings match anywhere;
 * regexes are for short codes that would otherwise hit other models
 * ("x5" inside Infiniti "QX50", "e300" inside "GLE300").
 */
export const MODEL_TERMS = {
  sonata: ["sonata", "쏘나타"],
  avante: ["avante", "elantra", "아반떼"],
  tucson: ["tucson", "투싼"],
  santafe: ["santa fe", "santafe", "싼타페"],
  sportage: ["sportage", "스포티지"],
  sorento: ["sorento", "쏘렌토"],
  carnival: ["carnival", "카니발"],
  bmw5: ["5 series", "5시리즈", /\b5[234]\d[ide]\b/],
  bmwx5: [/(^|[^a-z])x5\b/],
  eclass: ["e-class", "e class", "e클래스", /(^|[^a-z])e ?(200|220|250|300|350|400|450)/],
  glc: [/\bglc\b/],
  modely: ["model y", "modely", "모델 y", "모델y"],
  ioniq5: ["ioniq 5", "ioniq5", "아이오닉 5", "아이오닉5"],
} satisfies Record<string, readonly (string | RegExp)[]>;

export type ModelKey = keyof typeof MODEL_TERMS;

export const isModelKey = (v: string | null | undefined): v is ModelKey =>
  !!v && Object.prototype.hasOwnProperty.call(MODEL_TERMS, v);

/** Does this car belong to the model? Case-insensitive match on title + model. */
export const carMatchesModel = (car: { title?: string; model?: string }, key: ModelKey): boolean => {
  const hay = `${car.title ?? ""} ${car.model ?? ""}`.toLowerCase();
  return (MODEL_TERMS[key] as readonly (string | RegExp)[]).some((term) =>
    typeof term === "string" ? hay.includes(term) : term.test(hay),
  );
};

/** Korean and imported cars take turns, so the slider never shows one brand for long. */
export const HERO_SLIDES: HeroSlide[] = [
  { id: "hyundai-sonata", brand: "Hyundai", model: "Sonata", key: "sonata", focus: "56% 50%" },
  { id: "bmw-5series", brand: "BMW", model: "5 Series", key: "bmw5", focus: "62% 50%" },
  { id: "kia-sportage", brand: "Kia", model: "Sportage", key: "sportage" },
  { id: "mercedes-eclass", brand: "Mercedes-Benz", model: "E-Class", key: "eclass", light: true },
  { id: "hyundai-tucson", brand: "Hyundai", model: "Tucson", key: "tucson", focus: "45% 50%" },
  { id: "tesla-modely", brand: "Tesla", model: "Model Y", key: "modely", focus: "50% 58%" },
  { id: "kia-sorento", brand: "Kia", model: "Sorento", key: "sorento" },
  { id: "bmw-x5", brand: "BMW", model: "X5", key: "bmwx5", focus: "78% 50%" },
  { id: "hyundai-avante", brand: "Hyundai", model: "Avante", key: "avante", focus: "52% 50%" },
  { id: "mercedes-glc", brand: "Mercedes-Benz", model: "GLC", key: "glc", light: true },
  { id: "hyundai-santafe", brand: "Hyundai", model: "Santa Fe", key: "santafe" },
  { id: "hyundai-ioniq5", brand: "Hyundai", model: "Ioniq 5", key: "ioniq5", focus: "55% 50%", light: true },
  { id: "kia-carnival", brand: "Kia", model: "Carnival", key: "carnival" },
];
