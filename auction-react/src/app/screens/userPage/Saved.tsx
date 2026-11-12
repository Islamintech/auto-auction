import React from "react";
import { useTranslation } from "react-i18next";
import CarCard from "../landingPage/CarCard";
import { AuctionCar } from "../../../lib/types/landing";

interface Props {
  saved: AuctionCar[];
  onSave: (id: string) => void;
  onOpen: (car: AuctionCar) => void;
  onBrowse: () => void;
}

export default function Saved({ saved, onSave, onOpen, onBrowse }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <div className="mp-section-note">
        {t("mypage.savedNote", { count: saved.length })}
      </div>
      {saved.length === 0 ? (
        <div className="mp-empty">
          <div className="mp-empty__title">{t("mypage.noSavedTitle")}</div>
          <p className="mp-empty__body">{t("mypage.noSavedBody")}</p>
          <button className="mp-btn mp-btn--primary mp-btn--md" style={{ marginTop: 16 }} onClick={onBrowse}>
            {t("mypage.browseCars")}
          </button>
        </div>
      ) : (
        <div className="mp-saved-grid">
          {saved.map((c) => (
            <CarCard key={c.id} car={c} saved onSave={onSave} onOpen={onOpen} />
          ))}
        </div>
      )}
    </>
  );
}
