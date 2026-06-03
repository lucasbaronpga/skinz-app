import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

import {
  AnimatePresence,
  motion,
} from "framer-motion"

import {
  useAuth,
} from "./context/AuthContext"

import Home from "./pages/Home"
import Login from "./pages/Login"
import Round from "./pages/Round"
import Live from "./pages/Live"
import Matches from "./pages/Matches"
import MatchDetails from "./pages/MatchDetails"
import Leaderboard from "./pages/Leaderboard"
import Profile from "./pages/Profile"

import BottomNav from "./components/BottomNav"

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const location = useLocation()

  const {
    isAuthenticated,
    isLoading,
  } = useAuth()

  const hideBottomNav =
    location.pathname === "/login" ||
    location.pathname.startsWith("/live")

  if (isLoading) {
    return <SplashScreen />
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <AnimatedRoutes
        isAuthenticated={isAuthenticated}
      />

      {isAuthenticated && !hideBottomNav && (
        <BottomNav />
      )}
    </div>
  )
}

function AnimatedRoutes({
  isAuthenticated,
}) {
  const location = useLocation()

  const routeKey =
    `${location.pathname}${location.search}`

  return (
    <AnimatePresence mode="wait">
      <Routes
        location={location}
        key={routeKey}
      >
        {/* Login */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate
                to="/"
                replace
              />
            ) : (
              <PageTransition>
                <Login />
              </PageTransition>
            )
          }
        />

        {/* Home */}
        <Route
          path="/"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
            >
              <PageTransition>
                <Home />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* New Round */}
        <Route
          path="/round"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
            >
              <PageTransition>
                <Round />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Live Match */}
        <Route
          path="/live"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
            >
              <PageTransition>
                <Live />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Match Archive */}
        <Route
          path="/matches"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
            >
              <PageTransition>
                <Matches />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Match Details */}
        <Route
          path="/matches/:id"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
            >
              <PageTransition>
                <MatchDetails />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Leaderboard */}
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
            >
              <PageTransition>
                <Leaderboard />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              isAuthenticated={isAuthenticated}
            >
              <PageTransition>
                <Profile />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                isAuthenticated
                  ? "/"
                  : "/login"
              }
              replace
            />
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

function ProtectedRoute({
  children,
  isAuthenticated,
}) {
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    )
  }

  return children
}

function PageTransition({
  children,
}) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        y: -12,
      }}
      transition={{
        duration: 0.24,
        ease: "easeOut",
      }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  )
}

function SplashScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6">
      <motion.div
        initial={{
          opacity: 0,
          y: 16,
          scale: 0.96,
        }}
        animate={{
          opacity: 1,
          y: 0,
          scale: 1,
        }}
        transition={{
          duration: 0.35,
          ease: "easeOut",
        }}
        className="text-center"
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-slate-950 text-4xl font-black text-white shadow-2xl">
          S
        </div>

        <div className="mt-8 text-xs font-black uppercase tracking-[0.3em] text-emerald-600">
          Loading
        </div>

        <div className="mt-3 text-6xl font-black tracking-tight text-slate-950">
          Skinz
        </div>
      </motion.div>
    </div>
  )
}