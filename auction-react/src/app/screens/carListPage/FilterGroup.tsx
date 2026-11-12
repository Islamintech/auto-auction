import React from "react";

export default function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="cl-fg">
      <div className="cl-fg__title">{title}</div>
      {children}
    </div>
  );
}
