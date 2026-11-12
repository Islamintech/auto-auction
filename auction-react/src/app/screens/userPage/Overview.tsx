import React from "react";
import { useTranslation } from "react-i18next";
import SectionHeader from "../landingPage/SectionHeader";
import { useGlobals } from "../../hooks/useGlobals";
import { formatDate } from "../../../lib/locale";

interface Props {
  savedCount: number;
}

function hasValue(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

export default function Overview({ savedCount }: Props) {
  const { authMember } = useGlobals();
  const { t } = useTranslation();

  const joined = authMember?.createdAt
    ? formatDate(authMember.createdAt, { month: "short", year: "numeric" })
    : "-";

  const checklist: [string, boolean][] = [
    [t("mypage.ckName"), hasValue(authMember?.memberNick)],
    [t("mypage.ckPhone"), hasValue(authMember?.memberPhone)],
    [t("mypage.ckEmail"), hasValue(authMember?.memberEmail)],
    [t("mypage.ckCountry"), hasValue(authMember?.memberCountry)],
    [t("mypage.ckAddress"), hasValue(authMember?.memberAddress)],
    [t("mypage.ckTelegram"), hasValue(authMember?.memberTelegram)],
    [t("mypage.ckAbout"), hasValue(authMember?.memberDesc)],
    [t("mypage.ckAvatar"), hasValue(authMember?.memberImage)],
  ];

  const missing = checklist.filter(([, done]) => !done);

  const stats: [string, string, string][] = [
    [`${authMember?.memberPoints ?? 0}`, t("mypage.statRewardPoints"), "var(--accent)"],
    [`${savedCount}`, t("mypage.statSavedCars"), "var(--text)"],
    [`${(authMember?.memberType || t("mypage.buyer")).toString()}`, t("mypage.statAccountType"), "var(--ok)"],
    [joined, t("mypage.statMemberSince"), "var(--warn)"],
  ];

  return (
    <>
      <div className="mypage__stats">
        {stats.map(([n, l, c]) => (
          <div key={l} className="mypage__stat">
            <div className="mypage__stat-num" style={{ color: c }}>{n}</div>
            <div className="mypage__stat-label">{l}</div>
          </div>
        ))}
      </div>

      <div className="mypage__overview">
        <div>
          <SectionHeader number="01" title={t("mypage.welcome")} subtitle={t("mypage.welcomeSub")} />
          <div className="mp-transit" style={{ padding: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {t("mypage.hello", { name: authMember?.memberNick || t("mypage.member") })}
            </div>
            <div style={{ opacity: 0.7, lineHeight: 1.6 }}>
              {authMember?.memberDesc
                ? authMember.memberDesc
                : t("mypage.overviewDesc")}
            </div>
            <div style={{ marginTop: 16, fontSize: 12, opacity: 0.6 }}>
              {t("mypage.phone")}: {authMember?.memberPhone || t("mypage.notSet")} | {t("mypage.email")}: {authMember?.memberEmail || t("mypage.notSet")}
            </div>
          </div>
        </div>

        {missing.length > 0 && (
          <div>
            <SectionHeader number="02" title={t("mypage.checklistTitle")} subtitle={t("mypage.checklistSub")} />
            <div className="mp-activity">
              {missing.map(([label], i) => (
                <div key={label} className={`mp-activity__row${i === 0 ? " mp-activity__row--first" : ""}`}>
                  <span className="mp-activity__kind">- {label}</span>
                  <span className="mp-activity__msg">{t("mypage.notSet")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
