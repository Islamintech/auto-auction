import React from "react";

interface Props {
  number: string;
  title: string;
  subtitle?: string;
  link?: string;
  onLink?: () => void;
}

export default function SectionHeader({ number, title, subtitle, link, onLink }: Props) {
  return (
    <div className="landing-sh">
      <div>
        <div className="landing-sh__num">—— {number}</div>
        <h2 className="landing-sh__title">{title}</h2>
        {subtitle && <p className="landing-sh__sub">{subtitle}</p>}
      </div>
      {link && (
        <button className="landing-sh__link" onClick={onLink}>
          {link}
        </button>
      )}
    </div>
  );
}
