import { useState } from "react";
import { Box, Button, Container, ListItemIcon, Menu, MenuItem, Stack } from "@mui/material";
import { NavLink, useHistory } from "react-router-dom";
import { useGlobals } from "../../hooks/useGlobals";
import { imageUrl } from "../../../lib/api";
import { Logout, Menu as MenuIcon, Close as CloseIcon, Person, Login as LoginIcon } from "@mui/icons-material";
import ThemeToggle from "../themeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { useTranslation } from "react-i18next";

interface HomeNavbarProps {
  setSignupOpen: (isOpen: boolean) => void;
  setLoginOpen: (isOpen: boolean) => void;
  handleLogoutClick: (e: React.MouseEvent<HTMLElement>) => void;
  anchorEl: HTMLElement | null;
  handleCloseLogout: () => void;
  handleLogoutRequest: () => void;
}

export default function HomeNavbar(props: HomeNavbarProps) {
  const {
    setLoginOpen,
    handleCloseLogout,
    handleLogoutClick,
    handleLogoutRequest,
    anchorEl,
  } = props;
  const { authMember } = useGlobals();
  const { t } = useTranslation();
  const history = useHistory();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const goMyPage = () => {
    handleCloseLogout();
    history.push("/member-page");
  };
  const logout = () => {
    handleCloseLogout();
    handleLogoutRequest();
  };

  return (
    <div className="home-navbar">
      <Container className="navbar-container">
        <Stack className="menu">
          <Box>
            <NavLink to="/" className="brand-link">
              <img className="brand-logo" src="/img/logo.png" alt="Auto Auction" />
              <span className="brand-wordmark">AUTO AUCTION</span>
            </NavLink>
          </Box>
          <span className="nav-lang"><LanguageSwitcher /></span>
          {!authMember ? (
            <button
              type="button"
              className="nav-login-icon"
              aria-label={t("a11y.login")}
              onClick={() => setLoginOpen(true)}
            >
              <LoginIcon />
            </button>
          ) : (
            <button
              type="button"
              className="nav-login-icon nav-login-icon--avatar"
              aria-label={t("a11y.account")}
              onClick={handleLogoutClick}
            >
              <img
                className="user-avatar"
                src={imageUrl(authMember?.memberImage) || "/icons/default-user.svg"}
                alt="user avatar"
              />
            </button>
          )}
          <button
            type="button"
            className="nav-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
          {menuOpen && <div className="nav-backdrop" onClick={closeMenu} />}
          <Stack className={`links${menuOpen ? " links--open" : ""}`} onClick={closeMenu}>
            <Box className="hover-line">
              <NavLink to="/" activeClassName="underline" exact>{t("nav.home")}</NavLink>
            </Box>
            <Box className="hover-line">
              <NavLink to="/products" activeClassName="underline">{t("nav.cars")}</NavLink>
            </Box>
            <Box className="hover-line">
              <NavLink to="/news" activeClassName="underline">{t("nav.community")}</NavLink>
            </Box>
            <Box className="hover-line">
              <NavLink to="/verify" activeClassName="underline">{t("nav.verifyVin")}</NavLink>
            </Box>
            <Box className="hover-line">
              <NavLink to="/help" activeClassName="underline">{t("nav.help")}</NavLink>
            </Box>
            {authMember && (
              <Box className="hover-line">
                <NavLink to="/member-page" activeClassName="underline">{t("nav.myAccount")}</NavLink>
              </Box>
            )}

            <span className="nav-lang-desktop"><LanguageSwitcher /></span>
            <ThemeToggle />

            {!authMember ? (
              <Box>
                <Button variant="contained" className="login-button" onClick={() => setLoginOpen(true)}>
                  {t("nav.login")}
                </Button>
              </Box>
            ) : (
              <button
                type="button"
                className="account-trigger"
                aria-haspopup="menu"
                aria-controls={anchorEl ? "account-menu" : undefined}
                aria-expanded={anchorEl ? "true" : undefined}
                onClick={handleLogoutClick}
              >
                <img
                  className="user-avatar"
                  src={imageUrl(authMember?.memberImage) || "/icons/default-user.svg"}
                  alt="user avatar"
                />
              </button>
            )}

            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={Boolean(anchorEl)}
              onClose={handleCloseLogout}
              slotProps={{
                paper: {
                  elevation: 0,
                  className: "account-menu-paper",
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <MenuItem onClick={goMyPage}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                {t("nav.myPage")}
              </MenuItem>
              <MenuItem onClick={logout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                {t("nav.logout")}
              </MenuItem>
            </Menu>
          </Stack>
        </Stack>
      </Container>
    </div>
  );
}
