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
  verifyEmail: "/api/auth/verify-email",
  resendVerification: "/api/auth/resend-verification",
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password",
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

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase()
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
    error.code = typeof data.code === "string" ? data.code : null
    error.data = data

    throw error
  }

  return data
}

function postJson(url, payload) {
  return requestJson(url, {
    method: "POST",
    body: JSON.stringify(payload),
  })
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

  const login = useCallback(async ({ email, password, rememberMe = true }) => {
    const data = await postJson(AUTH_ENDPOINTS.login, {
      email: normalizeEmail(email),
      password: String(password ?? ""),
      rememberMe: Boolean(rememberMe),
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
      shortName,
      handicapIndex = null,
      homeClubId = null,
    }) =>
      postJson(AUTH_ENDPOINTS.register, {
        email: normalizeEmail(email),
        password: String(password ?? ""),
        displayName: String(displayName ?? "").trim(),
        shortName: String(shortName ?? "").trim().toUpperCase(),
        handicapIndex,
        homeClubId,
      }),
    []
  )

  const verifyEmail = useCallback(
    (token) => postJson(AUTH_ENDPOINTS.verifyEmail, { token }),
    []
  )

  const resendVerification = useCallback(
    (email) =>
      postJson(AUTH_ENDPOINTS.resendVerification, { email: normalizeEmail(email) }),
    []
  )

  const forgotPassword = useCallback(
    (email) =>
      postJson(AUTH_ENDPOINTS.forgotPassword, { email: normalizeEmail(email) }),
    []
  )

  const resetPassword = useCallback(
    ({ token, password }) =>
      postJson(AUTH_ENDPOINTS.resetPassword, {
        token,
        password: String(password ?? ""),
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
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      checkSession,
      isLoading,
      isAuthenticated: Boolean(user),
    }),
    [
      user,
      login,
      register,
      logout,
      verifyEmail,
      resendVerification,
      forgotPassword,
      resetPassword,
      checkSession,
      isLoading,
    ]
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
