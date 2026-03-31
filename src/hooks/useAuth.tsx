import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { AuthError, User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: AuthError | Error | null; user: User | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null; user: User | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPasswordForEmail: (email: string) => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function redirectOrigin(): string {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/auth`
}

/** Strips OAuth/magic-link tokens from the URL bar without a page reload. */
function cleanAuthHash(): void {
  const { hash, pathname, search } = window.location
  if (hash.includes('access_token') || hash.includes('type=')) {
    window.history.replaceState(null, '', pathname + search)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION on first subscription, so a separate
    // getSession() call is not needed and would create a race condition.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Remove OAuth / magic-link tokens from the URL bar after a successful sign-in
      if (event === 'SIGNED_IN') {
        cleanAuthHash()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectOrigin() },
    })
    return { error: error ?? null, user: data.user ?? null }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error, user: null }

    // onAuthStateChange (SIGNED_IN) will sync global state; return the user directly
    // from the API response so the caller can act immediately.
    const currentUser = data.session?.user ?? data.user ?? null
    if (!currentUser) {
      return {
        error: new Error(
          'Signed in, but no active session was found. Check your Supabase Auth settings and browser storage.'
        ),
        user: null,
      }
    }

    return { error: null, user: currentUser }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    // onAuthStateChange (SIGNED_OUT) will clear user/session state automatically.
  }

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth`,
    })
    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth`,
      },
    })
    return { error }
  }

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut, resetPasswordForEmail }}
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
