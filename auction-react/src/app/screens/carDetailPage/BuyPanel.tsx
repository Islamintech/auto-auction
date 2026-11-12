import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Tag from "./Tag";
import { AuctionCar } from "../../../lib/types/landing";
import ConsultationModal from "../../components/consultation/ConsultationModal";
import { formatKrw, formatUsdEstimate, useUsdKrwRate } from "../../../lib/currency";

export default function BuyPanel({ car }: { car: AuctionCar }) {
  const { t } = useTranslation();
  const [consultOpen, setConsultOpen] = useState(false);
  const isCrashed = car.category === "crashed";
  const rate = useUsdKrwRate();
  const usd = formatUsdEstimate(car.price, rate);
  const krw = formatKrw(car.price);

  return (
    <aside className="cd-aside" id="cd-buy-panel">
      <div className="cd-buy">
        <div className="cd-buy__tags">
          {isCrashed ? (
            <Tag color="var(--warn)">● {t("cardetail.crashed")}</Tag>
          ) : (
            <Tag outline color="var(--text)">{t("cardetail.readyToDrive")}</Tag>
          )}
        </div>
        <div className="cd-buy__label">{t("cardetail.fixedPrice")}</div>
        <div className={`cd-buy__price${krw.length > 14 ? " cd-buy__price--long" : ""}`}>{krw}</div>
        {usd && <div className="cd-buy__price-sub">{usd}</div>}

        <button className="cd-btn cd-btn--primary cd-btn--lg" style={{ marginTop: 18 }}>
          {t("cardetail.reserveDeposit")}
        </button>
        <button
          className="cd-btn cd-btn--secondary cd-btn--md"
          style={{ marginTop: 8 }}
          onClick={() => setConsultOpen(true)}
        >
          {t("cardetail.requestConsultation")}
        </button>
      </div>

      <ConsultationModal
        open={consultOpen}
        onClose={() => setConsultOpen(false)}
        carId={car.id}
        carTitle={`${car.brand} ${car.title}`}
      />

    </aside>
  );
}
