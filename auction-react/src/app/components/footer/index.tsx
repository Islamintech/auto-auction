import React from "react";
import { Box, Container, Stack } from "@mui/material";
import { Link } from "react-router-dom";
import styled from "styled-components";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PhoneIcon from "@mui/icons-material/Phone";
import { useTranslation } from "react-i18next";
import { CONTACT } from "../../../lib/contact";

const Footers = styled.div`
  width: 100%;
  background: var(--footer-bg, #0b0c0e);
  color: var(--footer-text, #d8d6cf);
  padding: 64px 0 32px;
  transition: background-color 0.2s ease, color 0.2s ease;

  @media (max-width: 480px) {
    padding: 36px 0 24px;
  }
`;

const scrollToTop = () => window.scrollTo({ top: 0, behavior: "auto" });

export default function Footer() {
  const { t } = useTranslation();
  return (
    <Footers>
      <Container className="footer-container">
        <Stack className="foot-top" flexDirection="row" flexWrap="wrap" gap="64px">
          <Stack className="foot-brand-col" flexDirection="column" style={{ width: "340px" }}>
            <Box className="brand-wordmark" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.05em", color: "var(--footer-heading)" }}>
              {CONTACT.wordmark}
            </Box>
            <Box className="foot-desc-txt" style={{ marginTop: 16, lineHeight: 1.6, opacity: 0.7 }}>
              {t("footer.desc")}
            </Box>
          </Stack>
          <Stack className="foot-link-cols" flexDirection="row" gap="100px">
            <Stack>
              <Box className="foot-category-title" style={{ color: "var(--footer-heading)", fontWeight: 600, marginBottom: 16 }}>
                {t("footer.marketplace")}
              </Box>
              <Box className="foot-category-link" style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.75 }}>
                <Link to="/" style={{ color: "inherit" }} onClick={scrollToTop}>{t("footer.home")}</Link>
                <Link to="/products" style={{ color: "inherit" }} onClick={scrollToTop}>{t("footer.browseCars")}</Link>
                <Link to="/member-page" style={{ color: "inherit" }} onClick={scrollToTop}>{t("footer.myAccount")}</Link>
                <Link to="/help" style={{ color: "inherit" }} onClick={scrollToTop}>{t("footer.helpFaq")}</Link>
              </Box>
            </Stack>
            <Stack>
              <Box className="foot-category-title" style={{ color: "var(--footer-heading)", fontWeight: 600, marginBottom: 16 }}>
                {t("footer.findUs")}
              </Box>
              <Box className="foot-category-link" style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.75 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LocationOnIcon fontSize="small" /> {CONTACT.address}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PhoneIcon fontSize="small" />
                  <a href={CONTACT.phoneHref} style={{ color: "inherit", textDecoration: "none" }}>
                    {CONTACT.phone}
                  </a>
                </Box>
              </Box>
            </Stack>
          </Stack>
        </Stack>
        <Stack className="foot-bottom" style={{ borderTop: "1px solid var(--footer-rule)", marginTop: 60, paddingTop: 20 }}>
          <Stack className="copyright-txt" style={{ opacity: 0.5, fontSize: 12 }}>
            © {new Date().getFullYear()} {CONTACT.companyName}. {t("footer.rights")}
          </Stack>
        </Stack>
      </Container>
    </Footers>
  );
}
