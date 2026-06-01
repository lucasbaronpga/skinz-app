import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"

import App from "./App.jsx"

import {
  AuthProvider,
} from "./context/AuthContext.jsx"

import {
  GameProvider,
} from "./context/GameContext.jsx"

createRoot(
  document.getElementById("root")
).render(

  <StrictMode>

    <AuthProvider>

      <GameProvider>

        <App />

      </GameProvider>

    </AuthProvider>

  </StrictMode>
)