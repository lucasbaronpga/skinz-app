import {
  StrictMode,
} from "react"

import {
  createRoot,
} from "react-dom/client"

import App from "./App.jsx"

import "./index.css"

import {
  AuthProvider,
} from "./context/AuthContext.jsx"

import {
  GameProvider,
} from "./context/GameContext.jsx"

const rootElement =
  document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element with id 'root' was not found.")
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </AuthProvider>
  </StrictMode>
)

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return
  }

  if (!import.meta.env.PROD) {
    return
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => {
        console.error(
          "Service Worker registration failed:",
          error
        )
      })
  })
}

registerServiceWorker()