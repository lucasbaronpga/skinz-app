import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

const AuthContext = createContext(null)

const STORAGE_KEY = "skinz-user"

function createUser(name) {
  return {
    name: String(name || "").trim(),
    createdAt: Date.now(),
  }
}

function isValidUser(user) {
  return (
    user &&
    typeof user === "object" &&
    typeof user.name === "string" &&
    user.name.trim().length > 0
  )
}

function getInitialUser() {
  try {
    const savedUser =
      localStorage.getItem(STORAGE_KEY)

    if (!savedUser) {
      return null
    }

    const parsedUser =
      JSON.parse(savedUser)

    if (!isValidUser(parsedUser)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return {
      ...parsedUser,
      name: parsedUser.name.trim(),
    }
  } catch {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage kann z. B. im Private Mode blockiert sein.
    }

    return null
  }
}

export function AuthProvider({ children }) {
  const [
    user,
    setUser,
  ] = useState(() => getInitialUser())

  const isLoading = false

  const login = useCallback((name) => {
    const cleanedName =
      String(name ?? "").trim()

    if (!cleanedName) {
      return false
    }

    const userData =
      createUser(cleanedName)

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(userData)
      )
    } catch {
      // Login soll auch funktionieren, wenn localStorage nicht verfügbar ist.
    }

    setUser(userData)

    return true
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Logout soll auch funktionieren, wenn localStorage nicht verfügbar ist.
    }

    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isLoading,
      isAuthenticated: Boolean(user),
    }),
    [
      user,
      login,
      logout,
      isLoading,
    ]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context =
    useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.")
  }

  return context
}