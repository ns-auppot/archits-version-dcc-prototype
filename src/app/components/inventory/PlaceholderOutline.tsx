/**
 * Wraps incomplete / placeholder sections with a purplish-pink dashed outline
 * so stakeholders can identify areas that still need design work.
 *
 * Set SHOW_PLACEHOLDERS to `false` (or remove the wrapper) before shipping.
 */

import type React from "react";

const SHOW_PLACEHOLDERS = true;

const outlineStyle: React.CSSProperties = {
  outline: "1.5px dashed rgba(217, 70, 239, 0.55)",
  outlineOffset: "-1px",
  borderRadius: "8px",
  position: "relative",
};

const badgeStyle: React.CSSProperties = {
  position: "absolute",
  top: 4,
  right: 6,
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  lineHeight: 1,
  padding: "3px 6px",
  borderRadius: "4px",
  background: "rgba(217, 70, 239, 0.12)",
  color: "rgba(217, 70, 239, 0.85)",
  pointerEvents: "none",
  zIndex: 5,
  whiteSpace: "nowrap",
};

export function PlaceholderOutline({
  children,
  label = "Placeholder",
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!SHOW_PLACEHOLDERS) return <>{children}</>;

  return (
    <div className={className} style={{ ...outlineStyle, ...style }}>
      <span style={badgeStyle}>{label}</span>
      {children}
    </div>
  );
}