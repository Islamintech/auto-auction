import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import { useTranslation } from "react-i18next";
import FilterGroup from "./FilterGroup";
import FilterRow from "./FilterRow";
import Chip from "./Chip";
import Tag from "./Tag";
import CarCard from "../landingPage/CarCard";
import CarPlaceholder from "../landingPage/CarPlaceholder";
import { retrieveCars, retrieveSavedIds } from "../landingPage/selector";
import { setCars, toggleSaved } from "../landingPage/slice";
import { AuctionCar } from "../../../lib/types/landing";
import CarService from "../../services/CarService";
import { imageUrl } from "../../../lib/api";
import { formatKrw, formatUsdEstimate, krwValue, useUsdKrwRate } from "../../../lib/currency";
import "../../../css/carList.css";
import { formatNumber } from "../../../lib/locale";

type View = "grid" | "list";
type Density = "spacious" | "compact";
type Sort = "newest" | "price-l" | "price-h" | "km" | "year";

interface Filters {
  brand: string;
  category: string;
  priceMax: number;
  sort: Sort;
}

const CONDITIONS: [string, string][] = [
  ["all", "condAll"],
  ["ready", "condReady"],
  ["crashed", "condCrashed"],
];

export default function CarListPage() {
  const { t } = useTranslation();
  const history = useHistory();
  const dispatch = useDispatch();
  const cars = useSelector(retrieveCars);
  const savedIds = useSelector(retrieveSavedIds);
  const usdRate = useUsdKrwRate();

  const [view, setView] = useState<View>("grid");
  const [density, setDensity] = useState<Density>("spacious");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const PAGE_SIZE = 5;
  const [filters, setFilters] = useState<Filters>({
    brand: "all",
    category: "all",
    priceMax: 1000000,
    sort: "newest",
  });

  useEffect(() => {
    const service = new CarService();
    service
      .getAll({ page: 1, limit: 100, order: "createdAt" })
      .then((data) => dispatch(setCars(data)))
      .catch((err) => console.error(err));
  }, [dispatch]);

  const brands = useMemo(() => {
    const set = new Set(cars.map((c) => c.brand).filter(Boolean));
    return [["all", t("carlist.brandAll")] as [string, string], ...Array.from(set).map((b) => [b, b] as [string, string])];
  }, [cars, t]);

  const filtered = useMemo(() => {
    const out = cars.filter((c) => {
      if (filters.brand !== "all" && c.brand !== filters.brand) return false;
      if (filters.category !== "all" && c.category !== filters.category) return false;
      // Prices are stored in KRW; the slider is in USD. Skip the price
      // filter until the exchange rate has loaded.
      if (usdRate && krwValue(c.price) / usdRate > filters.priceMax) return false;
      return true;
    });
    const sorted = [...out];
    switch (filters.sort) {
      case "price-l": sorted.sort((a, b) => krwValue(a.price) - krwValue(b.price)); break;
      case "price-h": sorted.sort((a, b) => krwValue(b.price) - krwValue(a.price)); break;
      case "km":     sorted.sort((a, b) => (a.km ?? 0) - (b.km ?? 0)); break;
      case "year":   sorted.sort((a, b) => b.year - a.year); break;
      default: break;
    }
    return sorted;
  }, [cars, filters, usdRate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = isMobile ? filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : filtered;

  // Reset to first page when the result set or device size changes
  useEffect(() => { setPage(1); }, [filters, isMobile]);

  const onSave = (id: string) => dispatch(toggleSaved(id));
  const openCar = (c: AuctionCar) => history.push(`/products/${c.id}`);
  const update = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch });

  return (
    <div className="carlist">
      <div className="carlist__head">
        <div className="carlist__crumb">{t("carlist.crumb")}</div>
        <div className="carlist__head-row">
          <h1 className="carlist__title">{t("carlist.title", { count: filtered.length })}</h1>
          <div className="carlist__toolbar">
            <button
              type="button"
              className="carlist__filters-btn"
              onClick={() => setFiltersOpen(true)}
            >
              ⚙ {t("carlist.filters")}
            </button>
            <select
              className="carlist__sort"
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as Sort })}
            >
              <option value="newest">{t("carlist.sortNewest")}</option>
              <option value="price-l">{t("carlist.sortPriceLow")}</option>
              <option value="price-h">{t("carlist.sortPriceHigh")}</option>
              <option value="km">{t("carlist.sortMileage")}</option>
              <option value="year">{t("carlist.sortYear")}</option>
            </select>
            <span className="carlist__divider" />
            <button
              className="carlist__view-btn"
              aria-label={view === "grid" ? "Switch to list view" : "Switch to grid view"}
              onClick={() => setView(view === "grid" ? "list" : "grid")}
            >{view === "grid" ? "☰" : "▦"}</button>
          </div>
        </div>
      </div>

      <div className="carlist__layout">
        {filtersOpen && <div className="carlist__filters-backdrop" onClick={() => setFiltersOpen(false)} />}
        <aside className={`carlist__filters${filtersOpen ? " carlist__filters--open" : ""}`}>
          <div className="carlist__filters-head">
            <div className="carlist__filters-title">{t("carlist.filters").toUpperCase()}</div>
            <button
              type="button"
              className="carlist__filters-close"
              aria-label={t("a11y.closeFilters")}
              onClick={() => setFiltersOpen(false)}
            >
              ✕
            </button>
          </div>

          <FilterGroup title={t("carlist.condition")}>
            {CONDITIONS.map(([v, l]) => (
              <FilterRow key={v} label={t(`carlist.${l}`)} active={filters.category === v} onClick={() => update({ category: v })} />
            ))}
          </FilterGroup>

          <FilterGroup title={t("carlist.brand")}>
            {brands.map(([v, l]) => (
              <FilterRow key={v} label={l} active={filters.brand === v} onClick={() => update({ brand: v })} />
            ))}
          </FilterGroup>

          <FilterGroup title={t("carlist.price")}>
            <div className="cl-range">
              <input
                type="range"
                min={10000}
                max={1000000}
                step={5000}
                value={filters.priceMax}
                onChange={(e) => update({ priceMax: +e.target.value })}
                className="cl-range__input"
              />
              <div className="cl-range__labels">
                <span>$10K</span>
                <span className="cl-range__current">≤ ${(filters.priceMax / 1000).toFixed(0)}K</span>
                <span>$1M</span>
              </div>
            </div>
          </FilterGroup>

          <FilterGroup title={t("carlist.density")}>
            <div className="cl-density">
              {(["spacious", "compact"] as Density[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setDensity(v)}
                  className={`cl-density__btn${density === v ? " cl-density__btn--active" : ""}`}
                >
                  {t(`carlist.${v}`)}
                </button>
              ))}
            </div>
          </FilterGroup>

          <button
            type="button"
            className="carlist__filters-apply"
            onClick={() => setFiltersOpen(false)}
          >
            {t("carlist.show", { count: filtered.length })}
          </button>
        </aside>

        <div className="carlist__results">
          <div className="cl-chips">
            {filters.brand !== "all" && (
              <Chip label={t("carlist.chipBrand", { value: filters.brand })} onClose={() => update({ brand: "all" })} />
            )}
            {filters.category !== "all" && (
              <Chip
                label={t("carlist.chipCondition", { value: filters.category === "ready" ? t("carlist.ready") : t("carlist.crashed") })}
                onClose={() => update({ category: "all" })}
              />
            )}
            <Chip label={t("carlist.chipMax", { value: (filters.priceMax / 1000).toFixed(0) })} />
            <span className="cl-chips__count">· {t("carlist.results", { count: filtered.length })}</span>
          </div>

          {view === "grid" ? (
            <div className="cl-grid">
              {paged.map((c) => (
                <CarCard
                  key={c.id}
                  car={c}
                  saved={savedIds.includes(c.id)}
                  onSave={onSave}
                  onOpen={openCar}
                  density={density}
                />
              ))}
            </div>
          ) : (
            <div className="cl-list">
              <div className="cl-list__head">
                <span>{t("carlist.colImage")}</span>
                <span>{t("carlist.colVehicle")}</span>
                <span>{t("carlist.colYear")}</span>
                <span>{t("carlist.colKm")}</span>
                <span>{t("carlist.colColor")}</span>
                <span>{t("carlist.colPrice")}</span>
                <span>{t("carlist.colStatus")}</span>
              </div>
              {paged.map((c) => {
                const img = imageUrl(c.image);
                return (
                  <div key={c.id} onClick={() => openCar(c)} className="cl-list__row">
                    {img ? (
                      <div style={{ backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", height: 70, borderRadius: 6 }} />
                    ) : (
                      <CarPlaceholder label={c.brand} tone={c.brand} height={70} />
                    )}
                    <div>
                      <div className="cl-list__model">{c.brand} {c.title}</div>
                    </div>
                    <span className="cl-list__num">{c.year}</span>
                    <span className="cl-list__num cl-list__num--mute">{c.km != null ? formatNumber(c.km) : "—"}</span>
                    <span className="cl-list__num cl-list__num--mute">{c.color || "—"}</span>
                    <span className="cl-list__price">
                      {formatKrw(c.price)}
                      {usdRate && <span className="cl-list__price-sub">{formatUsdEstimate(c.price, usdRate)}</span>}
                    </span>
                    <Tag color={c.category === "crashed" ? "var(--warn)" : "var(--text)"} outline={c.category !== "crashed"}>
                      {c.category === "crashed" ? t("carlist.tagCrashed") : t("carlist.tagReady")}
                    </Tag>
                  </div>
                );
              })}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>{t("carlist.noResults")}</div>
          )}

          {isMobile && totalPages > 1 && (
            <div className="cl-pagination">
              <button
                className="cl-pagination__btn"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("carlist.prev")}
              </button>
              <span className="cl-pagination__info">{page} / {totalPages}</span>
              <button
                className="cl-pagination__btn"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("carlist.next")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
