import { AnimatePresence, motion } from "framer-motion"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"
import AdminCoursesScreen from "./admin/AdminCoursesScreen"
import AdminDashboard from "./admin/AdminDashboard"
import AdminGolfClubScreen from "./admin/AdminGolfClubScreen"
import AdminGolfCourseScreen from "./admin/AdminGolfCourseScreen"
import AdminUsersScreen from "./admin/AdminUsersScreen"
import AdminRoute from "./components/AdminRoute"
import AppBackground from "./components/AppBackground"
import BottomNav from "./components/BottomNav"
import { useAuth } from "./context/AuthContext"
import HomeScreen from "./pages/HomeScreen"
import LeaderboardScreen from "./pages/LeaderboardScreen"
import LiveScoringScreen from "./pages/LiveScoringScreen"
import LoginScreen from "./pages/LoginScreen"
import MatchArchiveScreen from "./pages/MatchArchiveScreen"
import MatchDetailsScreen from "./pages/MatchDetailsScreen"
import ProfileScreen from "./pages/ProfileScreen"
import RoundSetupScreen from "./pages/RoundSetupScreen"

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
    location.pathname === "/login" ||
    location.pathname.startsWith("/live") ||
    location.pathname.startsWith("/admin")

  if (isLoading) {
    return <SplashScreen />
  }

  return (
    <>
      <AnimatedRoutes isAuthenticated={isAuthenticated} />
      {isAuthenticated && !hideBottomNav && <BottomNav />}
    </>
  )
}

function AnimatedRoutes({ isAuthenticated }) {
  const location = useLocation()
  const routeKey = `${location.pathname}${location.search}`

  return (
    <AnimatePresence mode="wait" initial={false}>
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
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersScreen />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/courses"
          element={
            <AdminRoute>
              <AdminCoursesScreen />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/courses/:clubId"
          element={
            <AdminRoute>
              <AdminGolfClubScreen />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/courses/:clubId/:courseId"
          element={
            <AdminRoute>
              <AdminGolfCourseScreen />
            </AdminRoute>
          }
        />
        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />}
        />
      </Routes>
    </AnimatePresence>
  )
}

function ProtectedRoute({ children, isAuthenticated }) {
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

function SplashScreen() {
  const loadingDots = [0, 1, 2]

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#e8ebe5] text-slate-950">
      <AppBackground />
      <div className="relative text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700">
          Loading
        </div>
        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          {loadingDots.map((dot) => (
            <motion.span
              key={dot}
              className="h-2.5 w-2.5 rounded-full bg-[#071819]"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -5, 0] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: dot * 0.14,
              }}
            />
          ))}
        </div>
        <div className="mt-5 text-5xl font-black tracking-[-0.07em]">Skinz</div>
      </div>
    </div>
  )
}
