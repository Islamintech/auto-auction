export const serverApi = process.env.REACT_APP_API_URL || "http://localhost:3000";

/** i18n keys — resolved through i18next when the message is displayed. */
export const Messages = {
    error1: "errors.generic",
    error2: "errors.loginFirst",
    error3: "errors.fillAll",
    error4: "errors.emptyMessage",
    error5: "errors.imageFormat"
}