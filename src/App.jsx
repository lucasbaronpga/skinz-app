import { Suspense, lazy, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
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
import FlightScreen from "./pages/FlightScreen"
import ForgotPasswordScreen from "./pages/ForgotPasswordScreen"
import HomeScreen from "./pages/HomeScreen"
import JoinScreen from "./pages/JoinScreen"
import LeaderboardScreen from "./pages/LeaderboardScreen"
import LiveScoringScreen from "./pages/LiveScoringScreen"
import LoginScreen from "./pages/LoginScreen"
import MatchArchiveScreen from "./pages/MatchArchiveScreen"
import MatchDetailsScreen from "./pages/MatchDetailsScreen"
import ProfileScreen from "./pages/ProfileScreen"
import ResetPasswordScreen from "./pages/ResetPasswordScreen"
import RoundSetupScreen from "./pages/RoundSetupScreen"
import VerifyEmailScreen from "./pages/VerifyEmailScreen"
import { takePendingInvite } from "./utils/invite"

// Die Design-Galerie gibt es nur in der Entwicklung (npm run dev / vercel dev).
const DesignGallery = import.meta.env.DEV
  ? lazy(() => import("./pages/DesignGallery"))
  : null

const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password", "/verify-email"]

const PUBLIC_ROUTES = [
  { path: "/forgot-password", element: <ForgotPasswordScreen /> },
  { path: "/reset-password", element: <ResetPasswordScreen /> },
  { path: "/verify-email", element: <VerifyEmailScreen /> },
  { path: "/join", element: <JoinScreen /> },
]

const PROTECTED_ROUTES = [
  { path: "/", element: <HomeScreen /> },
  { path: "/round", element: <RoundSetupScreen /> },
  { path: "/flights/:id", element: <FlightScreen /> },
  { path: "/live", element: <LiveScoringScreen /> },
  { path: "/live/:id", element: <LiveScoringScreen /> },
  { path: "/matches", element: <MatchArchiveScreen /> },
  { path: "/matches/:id", element: <MatchDetailsScreen /> },
  { path: "/leaderboard", element: <LeaderboardScreen /> },
  { path: "/profile", element: <ProfileScreen /> },
]

const ADMIN_ROUTES = [
  { path: "/admin", element: <AdminDashboard /> },
  { path: "/admin/users", element: <AdminUsersScreen /> },
  { path: "/admin/courses", element: <AdminCoursesScreen /> },
  { path: "/admin/courses/:clubId", element: <AdminGolfClubScreen /> },
  { path: "/admin/courses/:clubId/:courseId", element: <AdminGolfCourseScreen /> },
]

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

/** Öffnet eine gemerkte Einladung, sobald der Nutzer angemeldet ist. */
function usePendingInviteRedirect(isAuthenticated) {
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated || location.pathname === "/join") return

    const token = takePendingInvite()

    if (token) navigate(`/join#token=${token}`, { replace: true })
  }, [isAuthenticated, location.pathname, navigate])
}

function AppShell() {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAuth()
  const isDesignPreview = Boolean(DesignGallery) && location.pathname === "/design"
  const hideBottomNav =
    AUTH_PATHS.includes(location.pathname) ||
    location.pathname.startsWith("/live") ||
    location.pathname.startsWith("/admin")

  usePendingInviteRedirect(isAuthenticated)

  if (isLoading) {
    return <SplashScreen />
  }

  return (
    <>
      <AnimatedRoutes isAuthenticated={isAuthenticated} />
      {(isAuthenticated || isDesignPreview) && !hideBottomNav && <BottomNav />}
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

        {PUBLIC_ROUTES.map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={<PageTransition>{element}</PageTransition>}
          />
        ))}

        {DesignGallery && (
          <Route
            path="/design"
            element={
              <Suspense fallback={null}>
                <DesignGallery />
              </Suspense>
            }
          />
        )}

        {PROTECTED_ROUTES.map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <PageTransition>{element}</PageTransition>
              </ProtectedRoute>
            }
          />
        ))}

        {ADMIN_ROUTES.map(({ path, element }) => (
          <Route key={path} path={path} element={<AdminRoute>{element}</AdminRoute>} />
        ))}

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
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden text-ink">
      <AppBackground />
      <div className="relative text-center">
        <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700">
          Loading
        </div>
        <div className="mt-4 flex justify-center gap-2" aria-hidden="true">
          {loadingDots.map((dot) => (
            <motion.span
              key={dot}
              className="h-2.5 w-2.5 rounded-full bg-ink"
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
