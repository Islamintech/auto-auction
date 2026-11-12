import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LoginIcon from "@mui/icons-material/Login";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import PhoneIcon from "@mui/icons-material/Phone";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import GavelIcon from "@mui/icons-material/Gavel";
import { useTranslation } from "react-i18next";
import { T } from "../../../lib/types/common";
import { Messages } from "../../../lib/config";
import { LoginInput, MemberInput } from "../../../lib/types/member";
import MemberService from "../../services/MemberService";
import { sweetErrorHandling } from "../../../lib/sweetAlert";
import { useGlobals } from "../../hooks/useGlobals";

interface AuthenticationModalProps {
  signupOpen: boolean;
  loginOpen: boolean;
  handleSignupClose: () => void;
  handleLoginClose: () => void;
}

const PERK_ICONS: [JSX.Element, string, string][] = [
  [<GavelIcon fontSize="small" />, "auth.perk1Title", "auth.perk1Desc"],
  [<VerifiedUserIcon fontSize="small" />, "auth.perk2Title", "auth.perk2Desc"],
  [<LocalShippingIcon fontSize="small" />, "auth.perk3Title", "auth.perk3Desc"],
];

export default function AuthenticationModal(props: AuthenticationModalProps) {
  const { signupOpen, loginOpen, handleSignupClose, handleLoginClose } = props;
  const { t } = useTranslation();
  const [memberNick, setMemberNick] = useState<string>("");
  const [memberPhone, setMemberPhone] = useState<string>("");
  const [memberPassword, setMemberPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const { setAuthMember } = useGlobals();

  const reset = () => {
    setMemberNick("");
    setMemberPhone("");
    setMemberPassword("");
    setShowPassword(false);
  };

  const closeSignup = () => {
    handleSignupClose();
    reset();
  };
  const closeLogin = () => {
    handleLoginClose();
    reset();
  };

  const handleNick = (e: T) => setMemberNick(e.target.value);
  const handlePhone = (e: T) => setMemberPhone(e.target.value);
  const handlePassword = (e: T) => setMemberPassword(e.target.value);

  const handleKeyDown = (e: T) => {
    if (e.key !== "Enter") return;
    if (signupOpen) handleSignupRequest();
    else if (loginOpen) handleLoginRequest();
  };

  const handleSignupRequest = async () => {
    try {
      const isFullFill = memberNick.trim() && memberPhone.trim() && memberPassword.trim();
      if (!isFullFill) throw new Error(Messages.error3);
      if (memberPassword.length < 8) throw new Error(t("auth.passwordMin"));

      setSubmitting(true);
      const signupInput: MemberInput = { memberNick, memberPhone, memberPassword };
      const member = new MemberService();
      const result = await member.signup(signupInput);

      setAuthMember(result);
      closeSignup();
    } catch (err) {
      console.error(err);
      sweetErrorHandling(err).then();
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginRequest = async () => {
    try {
      const isFullFill = memberNick.trim() && memberPassword.trim();
      if (!isFullFill) throw new Error(Messages.error3);

      setSubmitting(true);
      const loginInput: LoginInput = { memberNick, memberPassword };
      const member = new MemberService();
      const result = await member.login(loginInput);

      setAuthMember(result);
      closeLogin();
    } catch (err) {
      console.error(err);
      sweetErrorHandling(err).then();
    } finally {
      setSubmitting(false);
    }
  };


  const renderBrandPanel = (heading: string, sub: string) => (
    <Box
      sx={{
        flex: "0 0 320px",
        background: "linear-gradient(160deg, #0b0c0e 0%, #1a1d24 100%)",
        color: "#e9e6dd",
        p: 4,
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 12, letterSpacing: "0.18em", opacity: 0.6 }}>AUTO AUCTION</Typography>
        <Typography sx={{ fontSize: 26, fontWeight: 700, mt: 2, lineHeight: 1.2 }}>{heading}</Typography>
        <Typography sx={{ fontSize: 13, opacity: 0.7, mt: 1.5, lineHeight: 1.6 }}>{sub}</Typography>
      </Box>
      <Stack spacing={2} sx={{ mt: 4 }}>
        {PERK_ICONS.map(([icon, titleKey, descKey], i) => (
          <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
            <Box sx={{ color: "#d8d6cf", mt: "2px" }}>{icon}</Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{t(titleKey)}</Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.65 }}>{t(descKey)}</Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
      <Typography sx={{ fontSize: 11, opacity: 0.5, mt: 4 }}>
        {t("auth.panelStats")}
      </Typography>
    </Box>
  );

  const renderForm = (mode: "signup" | "login") => {
    const isSignup = mode === "signup";
    return (
      <Box sx={{ flex: 1, p: { xs: 3, md: 4 }, position: "relative", minWidth: { xs: "100%", md: 380 } }}>
        <IconButton
          aria-label={t("a11y.close")}
          onClick={isSignup ? closeSignup : closeLogin}
          sx={{ position: "absolute", insetInlineEnd: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>

        <Typography sx={{ fontSize: 12, letterSpacing: "0.18em", opacity: 0.6 }}>
          {isSignup ? t("auth.getStarted") : t("auth.welcomeBack")}
        </Typography>
        <Typography sx={{ fontSize: 24, fontWeight: 700, mt: 0.5 }}>
          {isSignup ? t("auth.createAccountTitle") : t("auth.signInTitle")}
        </Typography>
        <Typography sx={{ fontSize: 13, opacity: 0.7, mt: 0.5, mb: 3 }}>
          {isSignup ? t("auth.signupSub") : t("auth.loginSub")}
        </Typography>

        <Stack spacing={2}>
          <TextField
            fullWidth
            size="small"
            label={t("auth.username")}
            value={memberNick}
            onChange={handleNick}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          {isSignup && (
            <TextField
              fullWidth
              size="small"
              label={t("auth.phone")}
              placeholder={t("auth.phonePlaceholder")}
              value={memberPhone}
              onChange={handlePhone}
              onKeyDown={handleKeyDown}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
          )}

          <TextField
            fullWidth
            size="small"
            label={t("auth.password")}
            type={showPassword ? "text" : "password"}
            value={memberPassword}
            onChange={handlePassword}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword((s) => !s)} edge="end">
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            fullWidth
            variant="contained"
            disabled={submitting}
            onClick={isSignup ? handleSignupRequest : handleLoginRequest}
            startIcon={isSignup ? <PersonAddAltIcon /> : <LoginIcon />}
            sx={{
              mt: 1,
              py: 1.2,
              background: "#0b0c0e",
              color: "#e9e6dd",
              fontWeight: 600,
              letterSpacing: "0.05em",
              "&:hover": { background: "#1a1d24" },
            }}
          >
            {submitting ? t("auth.pleaseWait") : isSignup ? t("auth.createAccount") : t("auth.signIn")}
          </Button>

          <Typography sx={{ fontSize: 11, opacity: 0.55, textAlign: "center", mt: 1 }}>
            {isSignup ? t("auth.termsNote") : t("auth.troubleNote")}
          </Typography>
        </Stack>
      </Box>
    );
  };

  return (
    <>
      <Dialog
        open={signupOpen}
        onClose={closeSignup}
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Stack direction="row" sx={{ minHeight: 480 }}>
            {renderBrandPanel(t("auth.signupHeading"), t("auth.signupHeadingSub"))}
            {renderForm("signup")}
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog
        open={loginOpen}
        onClose={closeLogin}
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 2, overflow: "hidden" } }}
      >
        <DialogContent sx={{ p: 0 }}>
          <Stack direction="row" sx={{ minHeight: 440 }}>
            {renderBrandPanel(t("auth.loginHeading"), t("auth.loginHeadingSub"))}
            {renderForm("login")}
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
