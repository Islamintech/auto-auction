import React from "react";

interface Props {
  label?: string;
  tone?: string;
  height?: number | string;
  compact?: boolean;
}

const HUE: Record<string, number> = {
  "sedan-a": 18, "sedan-b": 220, "sedan-c": 280,
  "suv-a": 35, "suv-b": 195, "suv-c": 0, "suv-d": 155,
  "van-a": 45,
};

export default function CarPlaceholder({ label, tone = "sedan-a", height = 190, compact = false }: Props) {
  const hue = HUE[tone] ?? 20;
  const style = {
    height,
    "--ph-stripe-1": `hsla(${hue}, 35%, 14%, 1)`,
    "--ph-stripe-2": `hsla(${hue}, 45%, 18%, 1)`,
    "--ph-accent": `hsla(${hue}, 60%, 55%, 0.9)`,
  } as React.CSSProperties;

  return (
    <div className={`car-ph${compact ? " car-ph--compact" : ""}`} style={style}>
      <div className="car-ph__vignette" />
      <div className="car-ph__bar" />
      <div className="car-ph__label">
        <span className="car-ph__label-main">{label}</span>
        <span className="car-ph__label-tone">IMG · {String(tone).toUpperCase()}</span>
      </div>
    </div>
  );
}
