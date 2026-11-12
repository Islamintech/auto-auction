import React from "react";
import SectionHeader from "./SectionHeader";
import CarCard from "./CarCard";
import { AuctionCar } from "../../../lib/types/landing";
import { useTranslation } from "react-i18next";

interface Props {
  cars: AuctionCar[];
  savedIds: string[];
  onSave: (id: string) => void;
  onOpen: (car: AuctionCar) => void;
  onViewAll: () => void;
}

export default function Featured({ cars, savedIds, onSave, onOpen, onViewAll }: Props) {
  const { t } = useTranslation();
  return (
    <section className="landing__section">
      <SectionHeader
        number="01"
        title={t("sections.featured")}
        subtitle={t("sections.featuredSub")}
        link={t("sections.viewAll")}
        onLink={onViewAll}
      />
      <div className="landing__featured-grid">
        {cars.map((c) => (
          <CarCard key={c.id} car={c} saved={savedIds.includes(c.id)} onSave={onSave} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
