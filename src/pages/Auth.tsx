import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Zap, Shield, CreditCard } from 'lucide-react'
import { useLanguage } from '@/i18n/LanguageContext'
import { getErrorMessage } from '@/lib/errors'
import { BrandLogo } from '@/components/BrandLogo'
import { supabase } from '@/lib/supabase'

type AuthDebugState = {
  sessionExists: boolean
  userId: string | null
  userEmail: string | null
  usersRowExists: boolean
  role: string | null
  authError: string | null
  usersError: string | null
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [debugLoading, setDebugLoading] = useState(false)
  const [debug, setDebug] = useState<AuthDebugState>({
    sessionExists: false,
    userId: null,
    userEmail: null,
    usersRowExists: false,
    role: null,
    authError: null,
    usersError: null,
  })
  const { signIn, signUp, resetPasswordForEmail, user, session } = useAuth()
  const navigate = useNavigate()
  const { t } = useLanguage()

  const refreshDebug = async () => {
    setDebugLoading(true)

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      const currentSession = sessionData.session
      const currentUser = currentSession?.user ?? null
      let usersRowExists = false
      let role: string | null = null
      let usersError: string | null = null

      if (currentUser?.id) {
        const debugSelect = await supabase.from('users').select('*').single()
        console.log('[Auth Debug] users single()', debugSelect.data, debugSelect.error)

        const { data: usersRow, error } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('id', currentUser.id)
          .maybeSingle()

        usersRowExists = !!usersRow
        role = usersRow?.role ?? null
        usersError = error?.message ?? null
      }

      setDebug({
        sessionExists: !!currentSession,
        userId: currentUser?.id ?? null,
        userEmail: currentUser?.email ?? null,
        usersRowExists,
        role,
        authError: sessionError?.message ?? null,
        usersError,
      })
    } catch (err) {
      setDebug((prev) => ({
        ...prev,
        authError: getErrorMessage(err, 'Unable to inspect auth state.'),
      }))
    } finally {
      setDebugLoading(false)
    }
  }

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash.includes('type=recovery')) {
      toast.success(t('resetEmailSent'))
    }
  }, [t])

  useEffect(() => {
    void refreshDebug()
  }, [user?.id, session?.access_token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error, user } = isLogin ? await signIn(email, password) : await signUp(email, password)

      if (error) {
        toast.error(getErrorMessage(error, t('somethingWentWrong')))
      } else if (isLogin && user) {
        toast.success(`${t('welcomeBack')}!`)
        navigate('/dashboard')
      } else if (isLogin) {
        toast.error('No active session was created after sign in.')
      } else {
        toast.success(t('accountCreated'))
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t('somethingWentWrong')))
    } finally {
      setLoading(false)
      void refreshDebug()
    }
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      toast.error(t('enterEmailFirst'))
      return
    }
    setLoading(true)
    try {
      const { error } = await resetPasswordForEmail(email.trim())
      if (error) toast.error(getErrorMessage(error, t('somethingWentWrong')))
      else {
        setResetSent(true)
        toast.success(t('resetEmailSent'))
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t('somethingWentWrong')))
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Zap, title: t('featureInstant'), desc: t('featureInstantDesc') },
    { icon: Shield, title: t('featureSecure'), desc: t('featureSecureDesc') },
    { icon: CreditCard, title: t('featureRates'), desc: t('featureRatesDesc') },
  ]

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <BrandLogo size="lg" className="mx-auto" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">
            <span className="gradient-primary bg-clip-text text-transparent">Charbel Card</span>
          </h1>
          <p className="text-muted-foreground text-sm">{t('brandTagline')}</p>
        </div>

        <div className="glass rounded-2xl border border-border/50 p-8 shadow-xl dark:shadow-primary/5 space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-heading font-semibold">{isLogin ? t('welcomeBack') : t('createAccount')}</h2>
            <p className="text-muted-foreground text-sm">{isLogin ? t('signInToAccount') : t('getStarted')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="auth-email" className="text-sm font-medium">
                {t('email')}
              </label>
              <Input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="bg-secondary/80 border-border"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="auth-password" className="text-sm font-medium">
                {t('password')}
              </label>
              <Input
                id="auth-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="bg-secondary/80 border-border"
              />
            </div>
            <Button type="submit" className="w-full gradient-primary font-semibold" disabled={loading}>
              {loading ? t('loading') : isLogin ? t('signIn') : t('signUp')}
            </Button>
          </form>

          {isLogin && (
            <div className="text-center">
              <button
                type="button"
                className="text-xs text-primary hover:underline disabled:opacity-50"
                disabled={loading || resetSent}
                onClick={() => void handleResetPassword()}
              >
                {t('forgotPassword')}
              </button>
            </div>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? t('noAccount') : t('hasAccount')}{' '}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? t('signUp') : t('signIn')}
            </button>
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-center sm:text-start max-w-lg mx-auto">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col sm:flex-row sm:items-start gap-2 rounded-xl bg-card/30 border border-border/40 p-3">
              <div className="mx-auto sm:mx-0 p-2 rounded-lg bg-primary/10 w-fit">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground text-sm">{title}</p>
                <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Auth Debug</h3>
              <p className="text-xs text-muted-foreground">Session, user, and admin-role checks from the app.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshDebug()} disabled={debugLoading}>
              {debugLoading ? 'Checking...' : 'Refresh'}
            </Button>
          </div>

          <div className="space-y-1 text-xs font-mono break-all">
            <p>session: {debug.sessionExists ? 'present' : 'missing'}</p>
            <p>auth user id: {debug.userId ?? 'null'}</p>
            <p>auth email: {debug.userEmail ?? 'null'}</p>
            <p>public.users row: {debug.usersRowExists ? 'present' : 'missing'}</p>
            <p>role: {debug.role ?? 'null'}</p>
            <p>auth error: {debug.authError ?? 'none'}</p>
            <p>users error: {debug.usersError ?? 'none'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
