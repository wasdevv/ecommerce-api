import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, handleUnauthorized, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const clear = useCallback(() => { setToken(null); setUser(null) }, [])

  useEffect(() => {
    handleUnauthorized(clear)
    if (!localStorage.getItem('token')) return setReady(true)
    // The token is the only thing stored; the user always comes from the API.
    api('/auth/me').then((r) => setUser(r.data)).catch(clear).finally(() => setReady(true))
  }, [clear])

  const signIn = (path, payload) => api(path, { method: 'POST', body: payload }).then(({ data }) => {
    setToken(data.token)
    setUser(data.user)
  })

  const value = {
    user,
    ready,
    login: (email, password) => signIn('/auth/login', { email, password }),
    register: (payload) => signIn('/auth/register', payload),
    logout: () => api('/auth/logout', { method: 'POST' }).catch(() => {}).finally(clear),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
