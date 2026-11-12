import React, { ReactNode, useState } from "react";
import { Member } from "../../lib/types/member";
import { GlobalContext } from "../hooks/useGlobals";

function readStoredMember(): Member | null {
  try {
    const raw = localStorage.getItem("memberData");
    return raw ? (JSON.parse(raw) as Member) : null;
  } catch {
    localStorage.removeItem("memberData");
    return null;
  }
}

const ContextProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // The auth token is an httpOnly cookie the browser sends automatically;
  // JS can't read it, so we trust localStorage for the UI state and let the
  // API's 401 interceptor clear auth when the server actually rejects us.
  const [authMember, setAuthMember] = useState<Member | null>(readStoredMember());

  const [orderBuilder, setOrderBuilder] = useState<Date>(new Date());

  const [openSignupFn, setOpenSignupFn] = useState<() => void>(() => () => {});

  return (
    <GlobalContext.Provider
      value={{
        authMember,
        setAuthMember,
        orderBuilder,
        setOrderBuilder,
        openSignup: openSignupFn,
        setOpenSignup: (fn: () => void) => setOpenSignupFn(() => fn),
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default ContextProvider;
