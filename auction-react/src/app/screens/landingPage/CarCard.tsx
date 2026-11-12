import React from "react";
import { useTranslation } from "react-i18next";
import CarPlaceholder from "./CarPlaceholder";
import { AuctionCar } from "../../../lib/types/landing";
import { imageUrl } from "../../../lib/api";
import { formatKrw, formatUsdEstimate, useUsdKrwRate } from "../../../lib/currency";
import { formatNumber } from "../../../lib/locale";

interface Props {
  car: AuctionCar;
  saved: boolean;
  onSave: (id: string) => void;
  onOpen: (car: AuctionCar) => void;
  density?: "spacious" | "compact";
}

export default function CarCard({ car, saved, onSave, onOpen, density = "spacious" }: Props) {
  const { t } = useTranslation();
  const rate = useUsdKrwRate();
  const usd = formatUsdEstimate(car.price, rate);
  const compact = density === "compact";
  const isCrashed = car.category === "crashed";
  const img = imageUrl(car.image);
  const mediaHeight = compact ? 150 : 190;

  return (
    <div className={`car-card${compact ? " car-card--compact" : ""}`} onClick={() => onOpen(car)}>
      <div className="car-card__media">
        {img ? (
          <div style={{ backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", height: mediaHeight, borderRadius: 8 }} />
        ) : (
          <CarPlaceholder label={car.brand} tone={car.brand} height={mediaHeight} compact={compact} />
        )}
        <div className="car-card__tags">
          {isCrashed ? (
            <span className="car-tag car-tag--warn">{t("card.crashed")}</span>
          ) : (
            <span className="car-tag car-tag--outline">{t("card.ready")}</span>
          )}
        </div>
      </div>

      <div className="car-card__body">
        <div className="car-card__head">
          <div className="car-card__head-main">
            <div className="car-card__meta">{car.brand} · {car.year}</div>
            <div className="car-card__name">{car.title}</div>
          </div>
        </div>

        <div className="car-card__specs">
          <span>{formatNumber(car.km ?? 0)} {t("card.km")}</span>
          {car.color && <><span className="car-card__sep">|</span><span>{car.color.toUpperCase()}</span></>}
          <span className="car-card__sep">|</span>
          <span>👁 {formatNumber(car.viewCount ?? 0)}</span>
          <span className="car-card__sep">|</span>
          <span>♥ {formatNumber(car.likeCount ?? 0)}</span>
        </div>

        <div className="car-card__rule" />

        <div className="car-card__foot">
          <div>
            <div className="car-card__price-label">{isCrashed ? t("card.priceCar") : t("card.price")}</div>
            <div className="car-card__price">{formatKrw(car.price)}</div>
            {usd && <div className="car-card__price-sub">{usd}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
