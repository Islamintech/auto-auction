import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CarPlaceholder from "../landingPage/CarPlaceholder";
import CarCard from "../landingPage/CarCard";
import SectionHeader from "../landingPage/SectionHeader";
import Tag from "./Tag";
import BuyPanel from "./BuyPanel";
import TabContent, { TabKey } from "./TabContent";
import { retrieveCars, retrieveSavedIds } from "../landingPage/selector";
import { toggleSaved } from "../landingPage/slice";
import { AuctionCar } from "../../../lib/types/landing";
import CarService from "../../services/CarService";
import { imageUrl } from "../../../lib/api";
import { formatKrw } from "../../../lib/currency";
import { useGlobals } from "../../hooks/useGlobals";
import { sweetErrorHandling } from "../../../lib/sweetAlert";
import "../../../css/carDetail.css";
import { formatDateTime, formatNumber } from "../../../lib/locale";

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const history = useHistory();
  const dispatch = useDispatch();
  const cars = useSelector(retrieveCars);
  const savedIds = useSelector(retrieveSavedIds);

  const [car, setCar] = useState<AuctionCar | null>(null);
  const [related, setRelated] = useState<AuctionCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState<TabKey>("specs");
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [liking, setLiking] = useState(false);
  const { authMember, openSignup } = useGlobals();

  useEffect(() => {
    const service = new CarService();
    setLoading(true);
    setActiveImg(0);
    service
      .getById(id)
      .then((data) => {
        setCar(data);
        setTab("specs");
      })
      .catch((err) => {
        console.error(err);
        setCar(null);
      })
      .finally(() => setLoading(false));

    service
      .getAll({ page: 1, limit: 20, order: "createdAt" })
      .then((data) => setRelated(data))
      .catch((err) => console.error(err));
  }, [id]);

  if (loading) {
    return <div className="cardetail"><div className="cd-empty">{t("cardetail.loading")}</div></div>;
  }

  if (!car) {
    return (
      <div className="cardetail">
        <div className="cd-empty">
          {t("cardetail.notFound")} <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => history.push("/products")}>{t("cardetail.backToListings")}</span>
        </div>
      </div>
    );
  }

  const isCrashed = car.category === "crashed";
  const images = car.images && car.images.length > 0 ? car.images : car.image ? [car.image] : [];
  const activeImage = images[activeImg] ? imageUrl(images[activeImg]) : "";

  const tabs: [TabKey, string][] = [["specs", "Specs"]];

  const more = (related.length > 0 ? related : cars)
    .filter((c) => c.id !== car.id && c.category === car.category)
    .slice(0, 4);
  const saved = !!car.myFavorite || savedIds.includes(car.id);

  const goLanding = () => history.push("/");
  const goCars = () => history.push("/products");
  const openCar = (c: AuctionCar) => history.push(`/products/${c.id}`);
  const onSave = (idArg: string) => dispatch(toggleSaved(idArg));

  const handleLike = async () => {
    if (!car || liking) return;
    if (!authMember) {
      openSignup();
      return;
    }
    const wasLiked = saved;
    const willBeLiked = !wasLiked;
    setCar((prev) =>
      prev
        ? {
            ...prev,
            myFavorite: willBeLiked,
            likeCount: Math.max(0, (prev.likeCount ?? 0) + (willBeLiked ? 1 : -1)),
          }
        : prev
    );
    dispatch(toggleSaved(car.id));
    try {
      setLiking(true);
      const service = new CarService();
      const updated = await service.like(car.id);
      setCar((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              myFavorite: willBeLiked,
              likeCount: updated.likeCount ?? prev.likeCount,
            }
          : prev
      );
    } catch (err) {
      console.error(err);
      setCar((prev) =>
        prev
          ? {
              ...prev,
              myFavorite: wasLiked,
              likeCount: Math.max(0, (prev.likeCount ?? 0) + (willBeLiked ? -1 : 1)),
            }
          : prev
      );
      dispatch(toggleSaved(car.id));
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async () => {
    if (!car) return;
    if (!authMember) {
      openSignup();
      return;
    }
    const text = commentText.trim();
    if (!text) return;
    try {
      setPosting(true);
      const service = new CarService();
      await service.comment(car.id, text);
      setCommentText("");
      const fresh = await service.getById(car.id);
      setCar((prev) => (prev ? { ...prev, ...fresh, myFavorite: prev.myFavorite } : fresh));
    } catch (err) {
      console.error(err);
      sweetErrorHandling(err).then();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="cardetail">
      <div className="cd-crumb">
        <span className="cd-crumb__link" onClick={goLanding}>{t("cardetail.home")}</span>
        <span>/</span>
        <span className="cd-crumb__link" onClick={goCars}>{t("cardetail.cars")}</span>
        <span>/</span>
        <span className="cd-crumb__current">{car.brand.toUpperCase()} {car.title.toUpperCase()}</span>
      </div>

      <div className="cd-top">
        <div>
          <div className="cd-gallery">
            {activeImage ? (
              <div className="cd-gallery__main" style={{ backgroundImage: `url(${activeImage})` }} />
            ) : (
              <CarPlaceholder label={`${car.brand} ${car.title}`} tone={car.brand} height={460} />
            )}
            {images.length > 1 && (
              <>
                <button className="cd-gallery__nav cd-gallery__nav--prev" onClick={() => setActiveImg((activeImg - 1 + images.length) % images.length)}>‹</button>
                <button className="cd-gallery__nav cd-gallery__nav--next" onClick={() => setActiveImg((activeImg + 1) % images.length)}>›</button>
              </>
            )}
            <div className="cd-gallery__tags">
              {isCrashed
                ? <Tag color="var(--warn)">● {t("cardetail.crashed")}</Tag>
                : <Tag outline color="var(--ok)">{t("cardetail.cleanTitle")}</Tag>}
            </div>
          </div>
          {images.length > 1 && (
            <div className="cd-thumbs">
              {images.map((img, i) => {
                const u = imageUrl(img);
                return (
                  <div key={i} onClick={() => setActiveImg(i)} className={`cd-thumb${i === activeImg ? " cd-thumb--active" : ""}`}>
                    {u ? (
                      <div style={{ backgroundImage: `url(${u})`, backgroundSize: "cover", backgroundPosition: "center", height: 70, borderRadius: 6 }} />
                    ) : (
                      <CarPlaceholder label={`0${i + 1}`} tone={car.brand} height={70} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="cd-title-block">
            <div className="cd-title-row">
              <div>
                <div className="cd-title-meta">
                  {car.brand} · {car.year}
                </div>
                <h1 className="cd-title">{car.title}</h1>
                <div style={{ display: "flex", flexWrap: "nowrap", gap: 16, fontSize: 12, opacity: 0.7, marginTop: 6, marginBottom: 12, fontFamily: "var(--mono-font)" }}>
                  <span>👁 {formatNumber(car.viewCount ?? 0)}</span>
                  <span>♥ {formatNumber(car.likeCount ?? 0)}</span>
                  <span>💬 {formatNumber(car.commentCount ?? 0)}</span>
                  <span>📞 {formatNumber(car.consultationCount ?? 0)}</span>
                </div>
              </div>
              <button
                className={`cd-save${saved ? " cd-save--on" : ""}`}
                onClick={handleLike}
                disabled={liking}
                aria-pressed={saved}
                aria-label={saved ? "Unlike" : "Like"}
              >
                <svg
                  className="cd-save__icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill={saved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                >
                  <path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9Z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="cd-tabs">
            {tabs.map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`cd-tab${tab === k ? " cd-tab--active" : ""}`}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="cd-desc">
            {car.desc || (isCrashed ? t("cardetail.descCrashed") : t("cardetail.descClean"))}
          </p>
          <div className="cd-tab-content">
            <TabContent tab={tab} car={car} />
          </div>
        </div>

        <BuyPanel car={car} />
      </div>

      <section className="cd-similar">
        <SectionHeader
          number="—"
          title={isCrashed ? t("cardetail.similarCrashed") : t("cardetail.similar")}
          subtitle={t("cardetail.similarSub")}
        />
        <div className="cd-similar__grid">
          {more.map((c) => (
            <CarCard
              key={c.id}
              car={c}
              saved={savedIds.includes(c.id)}
              onSave={onSave}
              onOpen={openCar}
            />
          ))}
        </div>
      </section>

      <section className="cd-comments">
        <div style={{ fontSize: 12, fontFamily: "var(--mono-font)", letterSpacing: "0.18em", opacity: 0.6, marginBottom: 12 }}>
          {t("cardetail.comments")} · {car.commentCount ?? 0}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleComment()}
            placeholder={authMember ? t("cardetail.commentPlaceholder") : t("cardetail.commentPlaceholderGuest")}
            disabled={!authMember || posting}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 6,
              border: "1px solid var(--rule, #2a2d34)",
              background: "transparent",
              color: "inherit",
              fontSize: 13,
            }}
          />
          <button
            onClick={authMember ? handleComment : openSignup}
            disabled={posting}
            style={{
              padding: "10px 18px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent)",
              color: "#0b0c0e",
              fontWeight: 700,
              letterSpacing: "0.05em",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {posting ? t("cardetail.posting") : authMember ? t("cardetail.post") : t("cardetail.signup")}
          </button>
        </div>

        {car.comments && car.comments.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {car.comments.map((c, i) => {
              const avatar = imageUrl(c.memberImage);
              const date = c.createdAt
                ? formatDateTime(c.createdAt, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              return (
                <div
                  key={c._id || i}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: 12,
                    border: "1px solid var(--rule, #2a2d34)",
                    borderRadius: 8,
                  }}
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={c.memberNick}
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "var(--rule, #2a2d34)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {(c.memberNick?.[0] || "?").toUpperCase()}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{c.memberNick || t("cardetail.member")}</span>
                      <span style={{ fontSize: 11, opacity: 0.5 }}>{date}</span>
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.85 }}>{c.commentContent}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: "center", opacity: 0.5, fontSize: 12 }}>
            {t("cardetail.noComments")}
          </div>
        )}
      </section>

      <div className="cd-stickybar">
        <div className="cd-stickybar__info">
          <span className="cd-stickybar__label">{t("cardetail.fixedPrice")}</span>
          <span className="cd-stickybar__price">{formatKrw(car.price)}</span>
        </div>
        <button
          className="cd-btn cd-btn--primary cd-stickybar__btn"
          onClick={() =>
            document.getElementById("cd-buy-panel")?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
        >
          {t("cardetail.reserve")}
        </button>
      </div>
    </div>
  );
}
