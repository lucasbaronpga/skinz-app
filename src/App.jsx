import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

import { AnimatePresence, motion } from "framer-motion"

import AppBackground from "./components/AppBackground"
import BottomNav from "./components/BottomNav"

import { useAuth } from "./context/AuthContext"

import HomeScreen from "./pages/HomeScreen"
import LoginScreen from "./pages/LoginScreen"
import RoundSetupScreen from "./pages/RoundSetupScreen"
import LiveScoringScreen from "./pages/LiveScoringScreen"
import MatchArchiveScreen from "./pages/MatchArchiveScreen"
import MatchDetailsScreen from "./pages/MatchDetailsScreen"
import LeaderboardScreen from "./pages/LeaderboardScreen"
import ProfileScreen from "./pages/ProfileScreen"

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function AppShell() {
  const location = useLocation()

  const { isAuthenticated, isLoading } = useAuth()

  const hideBottomNav =
    location.pathname === "/login" || location.pathname.startsWith("/live")

  if (isLoading) {
    return <SplashScreen />
  }

  return (
    <div className="min-h-[100dvh] bg-[#e8ebe5]">
      <AnimatedRoutes isAuthenticated={isAuthenticated} />

      {isAuthenticated && !hideBottomNav && <BottomNav />}
    </div>
  )
}

function AnimatedRoutes({ isAuthenticated }) {
  const location = useLocation()

  const routeKey = `${location.pathname}${location.search}`

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={routeKey}>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <PageTransition>
                <LoginScreen />
              </PageTransition>
            )
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PageTransition>
                <HomeScreen />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/round"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PageTransition>
                <RoundSetupScreen />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/live"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PageTransition>
                <LiveScoringScreen />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/matches"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PageTransition>
                <MatchArchiveScreen />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/matches/:id"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PageTransition>
                <MatchDetailsScreen />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PageTransition>
                <LeaderboardScreen />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <PageTransition>
                <ProfileScreen />
              </PageTransition>
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={isAuthenticated ? "/" : "/login"}
              replace
            />
          }
        />
      </Routes>
    </AnimatePresence>
  )
}

function ProtectedRoute({ children, isAuthenticated }) {
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

function PageTransition({ children }) {
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
      className="min-h-[100dvh]"
    >
      {children}
    </motion.div>
  )
}

function SplashScreen() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e8ebe5] px-6 text-slate-950">
      <AppBackground />

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
        className="relative w-full max-w-sm overflow-hidden rounded-[44px] border border-white/20 bg-[#071819] p-10 text-center text-white shadow-[0_28px_70px_rgba(7,24,25,0.42)]"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-emerald-400/32 via-emerald-500/8 to-transparent"
        />

        <div
          aria-hidden="true"
          className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/8 blur-3xl"
        />

        <div className="relative">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/15 bg-white/10 text-4xl font-black text-white shadow-2xl backdrop-blur-xl">
            S
          </div>

          <div className="mt-8 text-[12px] font-black uppercase tracking-[0.28em] text-emerald-200/85">
            Loading
          </div>

          <div className="mt-3 text-6xl font-black tracking-[-0.07em] text-white">
            Skinz
          </div>
        </div>
      </motion.div>
    </div>
  )
}