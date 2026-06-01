import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"

const AuthContext =
  createContext()

const STORAGE_KEY =
  "skinz-user"

function createUser(
  name
) {

  return {
    name:
      name.trim(),

    createdAt:
      Date.now(),
  }
}

export function AuthProvider({
  children,
}) {

  const [
    user,
    setUser,
  ] = useState(null)

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  useEffect(() => {

    try {

      const savedUser =
        localStorage.getItem(
          STORAGE_KEY
        )

      if (!savedUser) {
        setIsLoading(false)
        return
      }

      const parsedUser =
        JSON.parse(
          savedUser
        )

      if (
        parsedUser?.name
      ) {

        setUser(
          parsedUser
        )

      } else {

        localStorage.removeItem(
          STORAGE_KEY
        )
      }

    } catch {

      localStorage.removeItem(
        STORAGE_KEY
      )

      setUser(null)

    } finally {

      setIsLoading(false)

    }

  }, [])

  function login(
    name
  ) {

    const cleanedName =
      name.trim()

    if (!cleanedName) {
      return
    }

    const userData =
      createUser(
        cleanedName
      )

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        userData
      )
    )

    setUser(
      userData
    )
  }

  function logout() {

    localStorage.removeItem(
      STORAGE_KEY
    )

    setUser(null)
  }

  return (

    <AuthContext.Provider
      value={{

        user,

        login,

        logout,

        isLoading,

        isAuthenticated:
          !!user,
      }}
    >

      {children}

    </AuthContext.Provider>
  )
}

export function useAuth() {

  return useContext(
    AuthContext
  )
}