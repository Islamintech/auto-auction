import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGlobals } from "../../hooks/useGlobals";
import MemberService from "../../services/MemberService";
import { MemberUpdateInput } from "../../../lib/types/member";
import { sweetErrorHandling, sweetTopSmallSuccessAlert } from "../../../lib/sweetAlert";
import { imageUrl } from "../../../lib/api";

export function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mp-card">
      <div className="mp-card__head">{title}</div>
      <div className="mp-card__body">{children}</div>
    </div>
  );
}

export function SettingsRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?: "ok" | "warn";
}) {
  const cls =
    status === "ok" ? "mp-row__value mp-row__value--ok"
    : status === "warn" ? "mp-row__value mp-row__value--warn"
    : "mp-row__value";
  return (
    <div className="mp-row">
      <span className="mp-row__label">{label}</span>
      <span className={cls}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "transparent",
  color: "inherit",
  border: "1px solid var(--rule, #2a2d34)",
  borderRadius: 4,
  fontSize: 13,
  marginTop: 4,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  opacity: 0.6,
  marginTop: 12,
};

export default function SettingsTab({ onSaved }: { onSaved?: () => void } = {}) {
  const { authMember, setAuthMember } = useGlobals();
  const { t } = useTranslation();
  const [nick, setNick] = useState(authMember?.memberNick || "");
  const [phone, setPhone] = useState(authMember?.memberPhone || "");
  const [email, setEmail] = useState(authMember?.memberEmail || "");
  const [country, setCountry] = useState(authMember?.memberCountry || "");
  const [address, setAddress] = useState(authMember?.memberAddress || "");
  const [telegram, setTelegram] = useState(authMember?.memberTelegram || "");
  const [desc, setDesc] = useState(authMember?.memberDesc || "");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>(imageUrl(authMember?.memberImage));
  const [saving, setSaving] = useState(false);

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const onSave = async () => {
    if (!authMember) return;
    try {
      if (!nick.trim() || !phone.trim()) {
        throw new Error(t("mypage.requiredErr"));
      }

      setSaving(true);
      const input: MemberUpdateInput = {
        _id: authMember._id,
        memberNick: nick.trim(),
        memberPhone: phone.trim(),
        memberEmail: email,
        memberCountry: country,
        memberAddress: address,
        memberTelegram: telegram,
        memberDesc: desc,
        memberImage: image || undefined,
      };
      const service = new MemberService();
      const updated = await service.updateMember(input);
      setAuthMember(updated);
      await sweetTopSmallSuccessAlert(t("mypage.profileUpdated"), 800);
      if (onSaved) onSaved();
    } catch (err) {
      console.error(err);
      sweetErrorHandling(err).then();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mp-settings-grid">
      <SettingsCard title={t("mypage.cardProfile")}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: preview ? `url(${preview}) center/cover` : "var(--rule, #2a2d34)",
              border: "1px solid var(--rule, #2a2d34)",
            }}
          />
          <label style={{ cursor: "pointer", fontSize: 12, opacity: 0.8 }}>
            <input type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
            <span style={{ borderBottom: "1px solid currentColor" }}>{t("mypage.changeAvatar")}</span>
          </label>
        </div>

        <label style={labelStyle}>{t("mypage.username")}</label>
        <input style={inputStyle} value={nick} onChange={(e) => setNick(e.target.value)} />

        <label style={labelStyle}>{t("mypage.phone")}</label>
        <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label style={labelStyle}>{t("mypage.email")}</label>
        <input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} />

        <label style={labelStyle}>{t("mypage.about")}</label>
        <textarea
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </SettingsCard>

      <SettingsCard title={t("mypage.cardLocation")}>
        <label style={labelStyle}>{t("mypage.country")}</label>
        <input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value)} />

        <label style={labelStyle}>{t("mypage.address")}</label>
        <input style={inputStyle} value={address} onChange={(e) => setAddress(e.target.value)} />

        <label style={labelStyle}>{t("mypage.telegram")}</label>
        <input
          style={inputStyle}
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          placeholder="@username"
        />

        <button
          className="mp-btn mp-btn--primary mp-btn--md"
          style={{ marginTop: 24, width: "100%" }}
          onClick={onSave}
          disabled={saving}
        >
          {saving ? t("mypage.saving") : t("mypage.saveChanges")}
        </button>
      </SettingsCard>

      <SettingsCard title={t("mypage.cardAccount")}>
        <SettingsRow label={t("mypage.memberId")} value={authMember?._id?.slice(-8) || "—"} />
        <SettingsRow label={t("mypage.statusLabel")} value={(authMember?.memberStatus || t("mypage.active")).toString()} status="ok" />
        <SettingsRow label={t("mypage.typeLabel")} value={(authMember?.memberType || t("mypage.buyer")).toString()} />
        <SettingsRow label={t("mypage.rewardPoints")} value={String(authMember?.memberPoints ?? 0)} />
      </SettingsCard>
    </div>
  );
}
