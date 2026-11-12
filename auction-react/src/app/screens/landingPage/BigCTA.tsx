import React from "react";
import { useTranslation } from "react-i18next";
import { useGlobals } from "../../hooks/useGlobals";

interface Props {
  onSignup: () => void;
  onConsultation?: () => void;
}

export default function BigCTA({ onSignup, onConsultation }: Props) {
  const { authMember } = useGlobals();
  const { t } = useTranslation();

  if (authMember) {
    return (
      <section className="landing__section--cta">
        <div className="landing-cta">
          <div>
            <h2 className="landing-cta__title">{t("cta.memberTitle")}</h2>
            <p className="landing-cta__body">{t("cta.memberBody")}</p>
          </div>
          <div className="landing-cta__side">
            <button className="landing-cta__btn" onClick={onConsultation}>
              {t("cta.getConsultation")}
            </button>
            <span className="landing-cta__note">{t("cta.replyWithin24")}</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="landing__section--cta">
      <div className="landing-cta">
        <div>
          <h2 className="landing-cta__title">{t("cta.guestTitle")}</h2>
          <p className="landing-cta__body">{t("cta.guestBody")}</p>
        </div>
        <div className="landing-cta__side">
          <button className="landing-cta__btn" onClick={onSignup}>
            {t("nav.signup")} {t("cta.arrow")}
          </button>
          <span className="landing-cta__note">{t("cta.noCreditCard")}</span>
        </div>
      </div>
    </section>
  );
}
