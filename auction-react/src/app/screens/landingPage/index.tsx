import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import Hero from "./Hero";
import Featured from "./Featured";
import HowItWorks from "./HowItWorks";
import CommunityGrid from "./CommunityGrid";
import BigCTA from "./BigCTA";
import ConsultationModal from "../../components/consultation/ConsultationModal";
import { retrieveCars, retrieveSavedIds } from "./selector";
import { setCars, toggleSaved } from "./slice";
import { AuctionCar } from "../../../lib/types/landing";
import CarService from "../../services/CarService";
import { useGlobals } from "../../hooks/useGlobals";
import { formatKrw } from "../../../lib/currency";
import "../../../css/landing.css";

export default function LandingPage() {
  const history = useHistory();
  const dispatch = useDispatch();
  const cars = useSelector(retrieveCars);
  const savedIds = useSelector(retrieveSavedIds);
  const { openSignup } = useGlobals();
  const [consultOpen, setConsultOpen] = useState(false);

  const carOptions = useMemo(
    () =>
      cars.map((c) => ({
        id: c.id,
        label: `${c.brand} ${c.title} · ${formatKrw(c.price)}`,
      })),
    [cars]
  );

  useEffect(() => {
    const service = new CarService();
    service
      .getAll({ page: 1, limit: 24, order: "createdAt" })
      .then((data) => dispatch(setCars(data)))
      .catch((err) => console.error(err));
  }, [dispatch]);

  const crashed = cars.filter((c) => c.category === "crashed");
  const featured = [...cars]
    .sort((a, b) => {
      const scoreA = (a.likeCount ?? 0) * 2 + (a.viewCount ?? 0);
      const scoreB = (b.likeCount ?? 0) * 2 + (b.viewCount ?? 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);

  const goCars = () => history.push("/products");
  const goCommunity = () => history.push("/news");
  const goConsultation = () => setConsultOpen(true);
  const openCar = (c: AuctionCar) => history.push(`/products/${c.id}`);
  const onSave = (id: string) => dispatch(toggleSaved(id));

  return (
    <div className="landing">
      <Hero crashed={crashed} onBrowseCars={goCars} onOpenCar={openCar} />
      <Featured
        cars={featured}
        savedIds={savedIds}
        onSave={onSave}
        onOpen={openCar}
        onViewAll={goCars}
      />
      <HowItWorks />
      {/* The member leaderboard used to sit here. It rendered real nicknames and
          avatars publicly, so it was removed rather than hidden with CSS. */}
      <section className="landing__section--split">
        <CommunityGrid onOpen={goCommunity} />
      </section>
      <BigCTA onSignup={openSignup} onConsultation={goConsultation} />

      <ConsultationModal
        open={consultOpen}
        onClose={() => setConsultOpen(false)}
        carOptions={carOptions}
      />
    </div>
  );
}
