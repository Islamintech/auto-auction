import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { HERO_SLIDES } from "./heroSlides";

/** Time per slide. */
const SLIDE_MS = 4500;

interface Props {
  onBrowseModel: (modelKey: string) => void;
  onConsultation: () => void;
}

/**
 * Full-screen photo slider of everyday Korean cars (Sonata, Sportage, Tucson...),
 * replacing the 16 MB background video. Same behaviour as the HM Group site:
 * slow cross-fade with a gentle zoom, swipe on phones, arrow keys, progress
 * dots and pause; phones get the brands' own portrait photos.
 *
 * Only the current photo and its neighbours load at first; the rest follow once
 * the page has settled, so the first screen stays light on mobile data.
 */
export default function Hero({ onBrowseModel, onConsultation }: Props) {
  const { t } = useTranslation();
  const slides = HERO_SLIDES;
  const n = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [still, setStill] = useState(false); // reduced motion: no autoplay, no zoom
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0, 1, n - 1]));
  const [visible, setVisible] = useState(true);
  const root = useRef<HTMLElement>(null);
  const touchX = useRef<number | null>(null);

  const go = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStill(true);
      setPaused(true);
    }
  }, []);

  // Current photo and its neighbours first...
  useEffect(() => {
    const want = [active, (active + 1) % n, (active - 1 + n) % n];
    setLoaded((s) => (want.every((i) => s.has(i)) ? s : new Set([...Array.from(s), ...want])));
  }, [active, n]);
  // ...the rest once the page has settled, so jumping ahead never shows a blank slide.
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(new Set(slides.map((_, i) => i))), 3000);
    return () => clearTimeout(timer);
  }, [slides]);

  // Scrolled past the slider: stop the timer.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = !paused && !hover && visible && n > 1;
  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => go(active + 1), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [active, running, go]);

  // Arrow keys while the slider is on screen (not while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!visible || target?.closest?.("input, textarea, select, [role=dialog]")) return;
      const rtl = document.documentElement.dir === "rtl";
      if (e.key === "ArrowRight") go(active + (rtl ? -1 : 1));
      if (e.key === "ArrowLeft") go(active + (rtl ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, visible, go]);

  const slide = slides[active];

  return (
    <section
      ref={root}
      className={`hero-slider${still ? " hero-slider--still" : ""}`}
      aria-roledescription="carousel"
      aria-label={t("hero.sliderLabel")}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1));
      }}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`hero-slider__slide${i === active ? " is-on" : ""}`}
          aria-hidden={i !== active}
          style={{ ["--focus" as string]: s.focus ?? "50% 50%" }}
        >
          {loaded.has(i) ? (
            <picture>
              <source media="(max-width: 700px) and (orientation: portrait)" srcSet={`/hero/${s.id}-phone.webp`} />
              <img
                src={`/hero/${s.id}.webp`}
                srcSet={`/hero/${s.id}-1280.webp 1280w, /hero/${s.id}.webp 2400w`}
                sizes="100vw"
                alt={`${s.brand} ${s.model}`}
                decoding="async"
                {...(i === 0 ? { fetchpriority: "high" } : { loading: "lazy" as const })}
              />
            </picture>
          ) : null}
        </div>
      ))}

      <div className="hero-slider__copy" key={slide.id}>
        <div className="hero-slider__eyebrow">{slide.brand}</div>
        <h1 className="hero-slider__title">{slide.model}</h1>
        <p className="hero-slider__tagline">{t(`hero.slides.${slide.key}`)}</p>
        <div className="hero-slider__actions">
          <button
            type="button"
            className="landing-btn landing-btn--primary landing-btn--lg"
            onClick={() => onBrowseModel(slide.key)}
          >
            {t("hero.seeModel", { model: slide.model })} {t("cta.arrow")}
          </button>
          <button type="button" className="hero-slider__ghost" onClick={onConsultation}>
            {t("cardetail.requestConsultation")}
          </button>
        </div>
      </div>

      {n > 1 && (
        <>
          <button type="button" className="hero-slider__arrow hero-slider__arrow--prev" aria-label={t("hero.prev")} onClick={() => go(active - 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" className="hero-slider__arrow hero-slider__arrow--next" aria-label={t("hero.next")} onClick={() => go(active + 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
          <div
            className={`hero-slider__controls${running ? "" : " is-paused"}`}
            style={{ ["--slide-ms" as string]: `${SLIDE_MS}ms` }}
          >
            {slides.map((s, i) => (
              <button
                key={`${s.id}-${i === active ? active : "x"}`}
                type="button"
                className={`hero-slider__dot${i === active ? " is-on" : ""}`}
                aria-label={`${s.brand} ${s.model}`}
                aria-current={i === active}
                onClick={() => go(i)}
              />
            ))}
            <button
              type="button"
              className="hero-slider__pp"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? t("hero.play") : t("hero.pause")}
            >
              {paused ? (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19h4V5H6zm8-14v14h4V5z" /></svg>
              )}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/** The marketing figures band that used to sit at the bottom of the old hero. */
export function HeroStats() {
  const { t } = useTranslation();
  return (
    <div className="landing__stats landing__stats--band">
      {[
        ["1,200+", t("hero.statDelivered")],
        ["3", t("hero.statChannels")],
        ["45–60d", t("hero.statTransit")],
        ["96%", t("hero.statRepeat")],
      ].map(([num, label]) => (
        <div key={label} className="landing__stat">
          <div className="landing__stat-num">{num}</div>
          <div className="landing__stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
