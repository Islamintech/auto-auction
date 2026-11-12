import React from "react";

interface Props {
  color: string;
  outline?: boolean;
  children: React.ReactNode;
}

export default function Tag({ color, outline, children }: Props) {
  const style: React.CSSProperties = outline ? { color, borderColor: color } : { background: color };
  return (
    <span className={`cl-tag ${outline ? "cl-tag--outline" : "cl-tag--solid"}`} style={style}>
      {children}
    </span>
  );
}
