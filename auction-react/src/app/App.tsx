import React, { useEffect, useState } from "react";
import { Route, Switch, useLocation } from "react-router-dom";
import LandingPage from "./screens/landingPage";
import UserPage from "./screens/userPage";
import CarListPage from "./screens/carListPage";
import CarDetailPage from "./screens/carDetailPage";
import CarVerifyPage from "./screens/carVerifyPage";
import OtherNavbar from "./components/headers/OtherNavbar";
import Footer from "./components/footer";
import HelpPage from "./screens/helpPage";
import NewsPage from "./screens/newsPage";
import NewsDetailPage from "./screens/newsDetailPage";
import HomeNavbar  from "./components/headers/HomeNavbar";
import AuthenticationModal from "./components/auth";
import { sweetErrorHandling, sweetTopSmallSuccessAlert } from "../lib/sweetAlert";
import { Messages } from "../lib/config";
import MemberService from "./services/MemberService";
import { useGlobals } from "./hooks/useGlobals";
import { useTranslation } from "react-i18next";
import "../css/app.css";
import "../css/navbar.css";
import "../css/footer.css";

function App() {
  const location = useLocation();
  const {setAuthMember, setOpenSignup} = useGlobals();
  const { t } = useTranslation();
  const [signupOpen, setSignupOpen] = useState<boolean>(false);
  const [loginOpen, setLoginOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setOpenSignup(() => setSignupOpen(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**HANDLERS**/
  const handleSignupClose = () => setSignupOpen(false);
  const handleLoginClose = () => setLoginOpen(false);
  
  
  const handleLogoutClick = (e: React.MouseEvent<HTMLElement>) =>{
    setAnchorEl(e.currentTarget);
  };
  const handleCloseLogout = () => setAnchorEl(null);
  
  const handleLogoutRequest = async () => {
    try {
    
      const member = new MemberService();
      await member.logout();
      
      await sweetTopSmallSuccessAlert(t("toast.loggedOut"), 700);
      setAuthMember(null);
    }catch(err){
      console.error(err);
      sweetErrorHandling(Messages.error1)
    }
  }
 
  return (
    <>
      {location.pathname === "/" 
      ? <HomeNavbar 
          setSignupOpen = {setSignupOpen}
          setLoginOpen = {setLoginOpen}
          anchorEl={anchorEl}
          handleLogoutClick = {handleLogoutClick}
          handleCloseLogout = {handleCloseLogout}
          handleLogoutRequest = {handleLogoutRequest}
          /> 
      : <OtherNavbar 
          setSignupOpen = {setSignupOpen}
          setLoginOpen = {setLoginOpen}
          anchorEl={anchorEl}
          handleLogoutClick = {handleLogoutClick}
          handleCloseLogout = {handleCloseLogout}
          handleLogoutRequest = {handleLogoutRequest}
          />}
      <Switch>
        <Route path="/products/:id">
          <CarDetailPage />
        </Route>
        <Route path="/products">
          <CarListPage />
        </Route>
        <Route path="/verify/:vin">
          <CarVerifyPage />
        </Route>
        <Route path="/verify">
          <CarVerifyPage />
        </Route>
        <Route path="/member-page">
          <UserPage />
        </Route>
        <Route path="/help">
          <HelpPage />
        </Route>
        <Route path="/news/:id">
          <NewsDetailPage />
        </Route>
        <Route path="/news">
          <NewsPage />
        </Route>
        <Route path="/">
          <LandingPage />
        </Route>
      </Switch>
      <Footer />
    
      
    <AuthenticationModal 
      signupOpen = {signupOpen}
      loginOpen = {loginOpen}
      handleLoginClose={handleLoginClose}
      handleSignupClose={handleSignupClose}  
    />
    </>
  );
}

export default App;