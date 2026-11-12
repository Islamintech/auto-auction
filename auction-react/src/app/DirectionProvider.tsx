import { useEffect, useMemo } from "react";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { useTranslation } from "react-i18next";
import baseTheme from "./MaterialTheme";
import { dirFor } from "../i18n";

/**
 * Keeps the document direction, the MUI theme direction and the emotion
 * style cache in sync with the active language. Our own stylesheets already
 * use logical properties, so this only exists to flip the physical CSS that
 * MUI emits from inside its own components.
 */
const ltrCache = createCache({ key: "mui", stylisPlugins: [prefixer] });
const rtlCache = createCache({ key: "mui-rtl", stylisPlugins: [prefixer, rtlPlugin] });

export default function DirectionProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const direction = dirFor(i18n.language);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [direction, i18n.language]);

  const theme = useMemo(() => createTheme(baseTheme, { direction }), [direction]);

  return (
    <CacheProvider value={direction === "rtl" ? rtlCache : ltrCache}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </CacheProvider>
  );
}
