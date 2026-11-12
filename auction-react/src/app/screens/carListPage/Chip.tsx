import React from "react";

export default function Chip({ label, onClose }: { label: string; onClose?: () => void }) {
  return (
    <span className="cl-chip">
      {label}
      {onClose && (
        <span className="cl-chip__close" onClick={onClose}>×</span>
      )}
    </span>
  );
}
