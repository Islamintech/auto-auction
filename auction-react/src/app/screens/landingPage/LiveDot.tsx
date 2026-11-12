import React from "react";

export default function LiveDot({ size = 6 }: { size?: number }) {
  return <span className="landing-live-dot" style={{ width: size, height: size }} />;
}
