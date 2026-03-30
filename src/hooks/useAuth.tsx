import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { AuthError, User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: AuthError | Error | null; user: User | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null; user: User | null }>
  signOut: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function redirectOrigin(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/auth`
}

async function syncSession() {
  const { data, error } = await supabase.auth.getSession()
  console.log('[Auth] session sync', data.session, error)
  return { data, error }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] event', event, session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    syncSession().then(({ data: { session } }) => {
      console.log('[Auth] initial session', session)
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectOrigin() },
    })
    if (error) return { error, user: null }

    const { data: sessionData, error: sessionError } = await syncSession()
    const currentUser = sessionData.session?.user ?? data.user ?? null
    return { error: sessionError, user: currentUser }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error, user: null }

    const { data: sessionData, error: sessionError } = await syncSession()
    const currentSession = sessionData.session ?? data.session ?? null
    const currentUser = currentSession?.user ?? data.user ?? null

    setSession(currentSession)
    setUser(currentUser)

    if (sessionError) {
      return { error: sessionError, user: null }
    }

    if (!currentUser) {
      return {
        error: new Error('Signed in, but no active session was found. Check your Supabase Auth settings and browser storage.'),
        user: null,
      }
    }

    return { error: null, user: currentUser }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth`,
    })
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signOut, resetPasswordForEmail }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
