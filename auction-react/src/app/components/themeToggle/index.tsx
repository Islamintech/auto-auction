import React from "react";
import { useThemeMode } from "../../context/ThemeContext";
import { LightMode, DarkMode } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useThemeMode();
  const { t } = useTranslation();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? t("a11y.switchToLight") : t("a11y.switchToDark")}
      title={isDark ? t("a11y.lightMode") : t("a11y.darkMode")}
    >
      {isDark ? <LightMode fontSize="small" /> : <DarkMode fontSize="small" />}
    </button>
  );
}
