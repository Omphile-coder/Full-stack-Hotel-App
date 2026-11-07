import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/karla/400.css";
import "@fontsource/karla/500.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App";
import "./index.css";
import { store } from "./store";

/** Mount the application with one Redux store shared across guest and admin screens. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
