import React from "react";
import {createRoot} from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./app/store";
import App from "./app/App";
import "./css/index.css";
import CssBaseline from '@mui/material/CssBaseline';
import DirectionProvider from './app/DirectionProvider';
import {BrowserRouter as Router} from "react-router-dom";
import ContextProvider from "./app/context/ContextProvider";
import { ThemeContextProvider } from "./app/context/ThemeContext";
import "./i18n";

const container = document.getElementById("root")!;
const root = createRoot(container);
 
root.render(
  <React.StrictMode>
    <Provider store={store}>
     <ContextProvider>
      <ThemeContextProvider>
       <DirectionProvider>
        <CssBaseline />
        <Router>
         <App />
        </Router>
       </DirectionProvider>
      </ThemeContextProvider>
    </ContextProvider>
    </Provider>
  </React.StrictMode>,
);


