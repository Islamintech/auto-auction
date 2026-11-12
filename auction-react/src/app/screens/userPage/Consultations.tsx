import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import ConsultationService from "../../services/ConsultationService";
import { Consultation, ConsultationStatus } from "../../../lib/types/consultation";
import { formatDateTime } from "../../../lib/locale";

const statusColor: Record<ConsultationStatus, string> = {
  PENDING: "var(--warn, #ffb547)",
  IN_PROGRESS: "var(--accent, #d4a248)",
  RESOLVED: "var(--ok, #3ee07c)",
  CANCELLED: "var(--text-mute, #888)",
};

const statusKey: Record<ConsultationStatus, string> = {
  PENDING: "mypage.statusPending",
  IN_PROGRESS: "mypage.statusInProgress",
  RESOLVED: "mypage.statusResolved",
  CANCELLED: "mypage.statusCancelled",
};

export default function Consultations() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const service = new ConsultationService();
    service
      .getMy()
      .then((data) => setItems(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="mp-empty"><div className="mp-empty__title">{t("mypage.loading")}</div></div>;
  }

  if (items.length === 0) {
    return (
      <div className="mp-empty">
        <div className="mp-empty__title">{t("mypage.noConsultTitle")}</div>
        <p className="mp-empty__body">
          {t("mypage.noConsultBody")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mp-section-note">
        {t("mypage.consultNote", { count: items.length })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((c) => {
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
              key={c._id}
              style={{
                border: "1px solid var(--rule, #2a2d34)",
                borderRadius: 8,
                padding: 16,
                background: "var(--surface, transparent)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    padding: "3px 8px",
                    borderRadius: 4,
                    color: statusColor[c.status],
                    border: `1px solid ${statusColor[c.status]}`,
                  }}
                >
                  ● {t(statusKey[c.status])}
                </span>
                <span style={{ fontSize: 11, opacity: 0.6 }}>{date}</span>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                {t("mypage.car")}{" "}
                <span style={{ fontFamily: "var(--mono-font)" }}>
                  {!c.carId
                    ? t("mypage.deleted")
                    : typeof c.carId === "string"
                    ? `#${c.carId.slice(-8)}`
                    : `${c.carId.carBrand || c.carId.brand || ""} ${c.carId.carTitle || c.carId.title || ""}`.trim() ||
                      `#${(c.carId._id || "").slice(-8)}`}
                </span>{" "}
                · {t("mypage.contactVia", { contact: c.preferredContact })}
              </div>
              {c.message && (
                <div style={{ marginTop: 8, lineHeight: 1.6 }}>{c.message}</div>
              )}
              {c.adminNote && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "rgba(62, 224, 124, 0.08)",
                    borderInlineStart: "3px solid var(--ok, #3ee07c)",
                    borderRadius: 4,
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.7, marginBottom: 4 }}>
                    {t("mypage.replyFromTeam")}
                  </div>
                  {c.adminNote}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
