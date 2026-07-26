import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export default function AdminRoute({ children }) {
  const location = useLocation()
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

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

  if (user?.role !== "admin" || user?.status !== "active") {
    return <Navigate to="/" replace />
  }

  return children
}
