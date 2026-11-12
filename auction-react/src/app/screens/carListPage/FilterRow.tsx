import React from "react";

interface Props {
  label: string;
  active: boolean;
  onClick: () => void;
}

export default function FilterRow({ label, active, onClick }: Props) {
  return (
    <button onClick={onClick} className={`cl-fr${active ? " cl-fr--active" : ""}`}>
      <span className="cl-fr__box">{active && <span className="cl-fr__check">✓</span>}</span>
      {label}
    </button>
  );
}
