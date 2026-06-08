import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept window.fetch to support mobile applications / Capacitor wrappers
const BACKEND_URL = "https://ais-pre-xs4jnabpag7yq4g2ol4qbd-289708497600.europe-west2.run.app";

const isCapacitorOrWebView = typeof window !== "undefined" && (
  window.location.protocol.startsWith("capacitor") || 
  window.location.protocol.startsWith("app") || 
  window.location.protocol.startsWith("file") ||
  (window.location.hostname === "localhost" && window.location.port !== "3000") ||
  (window.location.hostname === "127.0.0.1" && window.location.port !== "3000")
);

if (isCapacitorOrWebView) {
  try {
    const originalFetch = window.fetch;
    const customFetch = async function (input: RequestInfo | URL, init?: RequestInit) {
      let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

      if (url.startsWith("/api/")) {
        url = `${BACKEND_URL}${url}`;
        if (typeof input !== "string" && !(input instanceof URL)) {
          const newRequest = new Request(url, {
            method: input.method,
            headers: input.headers,
            body: input.body,
            mode: input.mode,
            credentials: input.credentials,
            cache: input.cache,
            redirect: input.redirect,
            referrer: input.referrer,
            integrity: input.integrity,
          });
          return originalFetch(newRequest, init);
        }
      }

      return originalFetch(typeof input === "string" ? url : input, init);
    };

    const desc = Object.getOwnPropertyDescriptor(window, "fetch");
    if (desc && desc.writable) {
      window.fetch = customFetch;
    } else {
      Object.defineProperty(window, "fetch", {
        value: customFetch,
        configurable: true,
        writable: true,
        enumerable: true
      });
    }
  } catch (err) {
    console.warn("Unable to intercept window.fetch for Capacitor sync:", err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

