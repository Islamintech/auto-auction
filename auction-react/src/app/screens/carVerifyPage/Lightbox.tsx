import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { imageUrl } from "../../../lib/api";

interface LightboxProps {
  images: string[];
  startIndex?: number;
  onClose: () => void;
}

export default function Lightbox({ images, startIndex = 0, onClose }: LightboxProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length]
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [images.length]
  );

  // Keyboard navigation + lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [prev, next, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
    touchStartX.current = null;
  };

  if (!images.length) return null;

  return (
    <div className="cvlb" onClick={onClose}>
      <button className="cvlb__close" aria-label={t("a11y.close")} onClick={onClose}>
        ✕
      </button>

      <div
        className="cvlb__stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images.length > 1 && (
          <button className="cvlb__nav cvlb__nav--prev" aria-label={t("a11y.previous")} onClick={prev}>
            ‹
          </button>
        )}

        <img className="cvlb__img" src={imageUrl(images[index])} alt={`View ${index + 1}`} />

        {images.length > 1 && (
          <button className="cvlb__nav cvlb__nav--next" aria-label={t("a11y.next")} onClick={next}>
            ›
          </button>
        )}
      </div>

      {images.length > 1 && (
        <div className="cvlb__bar" onClick={(e) => e.stopPropagation()}>
          <div className="cvlb__counter">
            {index + 1} / {images.length}
          </div>
          <div className="cvlb__thumbs">
            {images.map((img, i) => (
              <button
                key={i}
                className={`cvlb__thumb${i === index ? " cvlb__thumb--active" : ""}`}
                style={{ backgroundImage: `url(${imageUrl(img)})` }}
                aria-label={`Go to image ${i + 1}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
