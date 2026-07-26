import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

const AuthContext = createContext(null)

const AUTH_ENDPOINTS = {
  login: "/api/auth/login",
  logout: "/api/auth/logout",
  register: "/api/auth/register",
  session: "/api/auth/session",
}

function normalizeUser(user) {
  if (!user || typeof user !== "object") return null

  const displayName = String(
    user.displayName ?? user.display_name ?? user.name ?? ""
  ).trim()

  if (!displayName) return null

  return {
    ...user,
    displayName,
    name: displayName,
  }
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })
  const data = await readJson(response)

  if (!response.ok) {
    const error = new Error(
      typeof data.error === "string" && data.error.trim()
        ? data.error
        : "Die Anfrage konnte nicht verarbeitet werden."
    )
    error.status = response.status
    error.data = data
    throw error
  }

  return data
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const checkSession = useCallback(async () => {
    try {
      const data = await requestJson(AUTH_ENDPOINTS.session, {
        method: "GET",
      })
      const sessionUser = normalizeUser(data.user)
      const authenticatedUser =
        data.authenticated && sessionUser ? sessionUser : null

      setUser(authenticatedUser)
      return authenticatedUser
    } catch (error) {
      setUser(null)

      if (error.status !== 401) {
        console.error("Session check failed.", error)
      }

      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    requestJson(AUTH_ENDPOINTS.session, {
      method: "GET",
    })
      .then((data) => {
        if (isCancelled) return

        const sessionUser = normalizeUser(data.user)
        setUser(data.authenticated && sessionUser ? sessionUser : null)
      })
      .catch((error) => {
        if (isCancelled) return

        setUser(null)

        if (error.status !== 401) {
          console.error("Session check failed.", error)
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const data = await requestJson(AUTH_ENDPOINTS.login, {
      method: "POST",
      body: JSON.stringify({
        email: String(email ?? "").trim().toLowerCase(),
        password: String(password ?? ""),
      }),
    })
    const authenticatedUser = normalizeUser(data.user)

    if (!data.authenticated || !authenticatedUser) {
      throw new Error("Die Anmeldung konnte nicht abgeschlossen werden.")
    }

    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const register = useCallback(
    async ({
      email,
      password,
      displayName,
      handicapIndex = null,
      homeClubId = null,
    }) =>
      requestJson(AUTH_ENDPOINTS.register, {
        method: "POST",
        body: JSON.stringify({
          email: String(email ?? "").trim().toLowerCase(),
          password: String(password ?? ""),
          displayName: String(displayName ?? "").trim(),
          handicapIndex,
          homeClubId,
        }),
      }),
    []
  )

  const logout = useCallback(async () => {
    try {
      await requestJson(AUTH_ENDPOINTS.logout, {
        method: "POST",
      })
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      checkSession,
      isLoading,
      isAuthenticated: Boolean(user),
    }),
    [user, login, register, logout, checkSession, isLoading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.")
  }

  return context
}
