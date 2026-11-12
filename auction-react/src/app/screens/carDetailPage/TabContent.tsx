import React from "react";
import { useTranslation } from "react-i18next";
import { AuctionCar } from "../../../lib/types/landing";
import { formatNumber } from "../../../lib/locale";

export type TabKey = "specs";

export default function TabContent({ tab, car }: { tab: TabKey; car: AuctionCar }) {
  const { t } = useTranslation();
  const isCrashed = car.category === "crashed";

  if (tab === "specs") {
    const rows: [string, string | number][] = [
      [t("cardetail.rowBrand"), car.brand],
      [t("cardetail.rowYear"), car.year],
      [t("cardetail.rowMileage"), `${formatNumber(car.km ?? 0)} km`],
      [t("cardetail.rowColor"), car.color || t("cardetail.dash")],
      [t("cardetail.rowStatus"), car.status],
      [t("cardetail.rowBodyType"), isCrashed ? t("cardetail.bodyDamaged") : t("cardetail.dash")],
      [t("cardetail.rowInspection"), isCrashed ? t("cardetail.inspectionDamaged") : t("cardetail.inspectionClean")],
    ];
    return (
      <div className="cd-specs">
        {rows.map(([k, v]) => (
          <div key={k} className="cd-specs__row">
            <span className="cd-specs__k">{k}</span>
            <span className="cd-specs__v">{v}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
}
