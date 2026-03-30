import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Wallet, Clock, ArrowLeft, Package, Plus, Copy, Check, X,
  TrendingUp, TrendingDown, Minus, ChevronDown, Send, Upload,
  FileText, Loader2, Users, Gift, ShoppingBag, Sparkles,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import PromoCodeInput from '@/components/PromoCodeInput'
import { useLanguage } from '@/i18n/LanguageContext'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { formatUsd } from '@/lib/formatCurrency'

// ─── Animated balance delta toast ─────────────────────────────────────────────
function BalanceDelta({ delta, onDone }: { delta: number; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500)
    return () => clearTimeout(t)
  }, [onDone])

  const isPositive = delta > 0
  return (
    <div className={`fixed top-24 right-6 z-[200] animate-in slide-in-from-top-2 fade-in duration-300 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl border font-black text-sm ${
      isPositive
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-destructive/10 border-destructive/30 text-destructive'
    }`}>
      {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      {isPositive ? '+' : ''}{formatUsd(Math.abs(delta))} {isPositive ? 'added 💚' : 'deducted 💸'}
    </div>
  )
}

export default function Dashboard() {
  const { user, session } = useAuth()
  const { t, dir } = useLanguage()
  const queryClient = useQueryClient()
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [referralCopied, setReferralCopied] = useState(false)
  const [referralInput, setReferralInput] = useState('')
  const [referralLoading, setReferralLoading] = useState(false)
  const [txFilter, setTxFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [txLimit, setTxLimit] = useState(15)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Animated balance delta
  const [balanceDelta, setBalanceDelta] = useState<number | null>(null)
  const prevBalanceRef = useRef<number | null>(null)

  const WHISH_NUMBER = "70-126177"
  const WHATSAPP_LINK = `https://wa.me/96170126177?text=Hello Charbel, I just sent a Whish transfer of ${topUpAmount}$ for my account ${user?.email}`

  // ── User row (balance + referral_code) ──────────────────────────────────────
  const { data: userRow, isLoading: userLoading } = useQuery({
    queryKey: ['users', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('balance, referral_code, referred_by_id')
        .eq('id', user!.id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!session && !!user?.id,
  })

  // ── Transactions ────────────────────────────────────────────────────────────
  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data ?? []
    },
    enabled: !!session && !!user?.id,
  })

  // ── Recent orders (preview) ────────────────────────────────────────────────
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, services(name), packages(name, price)')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data ?? []
    },
    enabled: !!session && !!user?.id,
  })

  // ── Pending deposits ────────────────────────────────────────────────────────
  const { data: topUps = [] } = useQuery({
    queryKey: ['topups', user?.id],
    queryFn: async () => {
      // @ts-ignore
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data || []
    },
    enabled: !!session && !!user?.id,
  })

  // ── Referral stats ──────────────────────────────────────────────────────────
  const { data: referralStats } = useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_referral_stats')
      if (error) throw error
      return data as { referral_code: string; total_referrals: number; total_earned: number }
    },
    enabled: !!session && !!user?.id,
    staleTime: 30_000,
  })

  // ── Realtime: balance updates ───────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`dashboard-users-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        (payload) => {
          const newBalance = Number((payload.new as any).balance ?? 0)
          if (prevBalanceRef.current !== null) {
            const delta = newBalance - prevBalanceRef.current
            if (Math.abs(delta) > 0.001) setBalanceDelta(delta)
          }
          prevBalanceRef.current = newBalance
          void queryClient.invalidateQueries({ queryKey: ['users', user.id] })
          void queryClient.invalidateQueries({ queryKey: ['transactions', user.id] })
        }
      )
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [user?.id, queryClient])

  // Set initial prevBalance once loaded
  useEffect(() => {
    if (userRow && prevBalanceRef.current === null) {
      prevBalanceRef.current = Number(userRow.balance ?? 0)
    }
  }, [userRow])

  const balance = userRow?.balance ?? 0

  // ── Copy referral code ──────────────────────────────────────────────────────
  const copyReferralCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setReferralCopied(true)
    setTimeout(() => setReferralCopied(false), 2000)
    toast.success('Referral code copied!')
  }

  const copyNumber = () => {
    navigator.clipboard.writeText(WHISH_NUMBER)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Whish Number Copied!')
  }

  // ── Apply referral ──────────────────────────────────────────────────────────
  const handleApplyReferral = async () => {
    const code = referralInput.trim().toUpperCase()
    if (!code) return
    setReferralLoading(true)
    try {
      const { data, error } = await supabase.rpc('apply_referral_code', { p_referral_code: code })
      if (error) throw error
      const result = data as any
      if (!result.success) {
        toast.error(result.error ?? 'Invalid referral code')
      } else {
        toast.success(result.message ?? 'Referral applied!', { icon: '🎁' })
        setReferralInput('')
        void queryClient.invalidateQueries({ queryKey: ['referral-stats', user?.id] })
        void queryClient.invalidateQueries({ queryKey: ['users', user?.id] })
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply referral code.')
    } finally {
      setReferralLoading(false)
    }
  }

  // ── Whish topup submit ──────────────────────────────────────────────────────
  const handleManualConfirm = async () => {
    const amount = parseFloat(topUpAmount)
    if (!amount || amount <= 0) return toast.error('Please enter a valid amount.')
    if (!selectedFile) return toast.error('Please upload payment proof (image).')

    setSubmitting(true)
    try {
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${user?.id}/${Math.random()}.${fileExt}`
      const filePath = `proofs/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, selectedFile)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(filePath)

      // @ts-ignore
      const { error } = await supabase.from('deposit_requests').insert({
        user_id: user?.id,
        amount,
        method: 'WISH',
        status: 'pending',
        proof: publicUrl,
      })
      if (error) throw error

      toast.success('Request Sent! Admin will verify your receipt shortly.')
      setShowTopUp(false)
      setTopUpAmount('')
      setSelectedFile(null)
      void queryClient.invalidateQueries({ queryKey: ['topups', user?.id] })
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) return toast.error('File size is too large (max 5MB)')
      setSelectedFile(file)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6 animate-fade-in pb-24 sm:pb-20">
      {/* Animated balance delta overlay */}
      {balanceDelta !== null && (
        <BalanceDelta delta={balanceDelta} onDone={() => setBalanceDelta(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">My Hub Center</h1>
          <p className="text-muted-foreground text-[9px] sm:text-[10px] font-black uppercase tracking-widest opacity-60">
            ID: {user?.id?.substring(0, 8)}…
          </p>
        </div>
        <Link to="/home">
          <Button variant="outline" size="sm" className="rounded-full px-4 border-white/5 bg-white/5 hover:bg-white/10 font-black text-[10px] shrink-0">
            <ArrowLeft className="w-3 h-3 mr-1.5" /> HOME
          </Button>
        </Link>
      </div>

      {/* Top cards */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* BALANCE CARD */}
        <div className="relative overflow-hidden glass rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 glow shadow-2xl border-white/5 group sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
            <Wallet className="w-24 h-24 sm:w-32 sm:h-32" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3 sm:mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Balance
          </div>
          {userLoading ? (
            <Skeleton className="h-10 sm:h-12 w-40 sm:w-48 rounded-2xl" />
          ) : (
            <p className="text-4xl sm:text-5xl font-black tracking-tighter mb-5 sm:mb-8 transition-all duration-500">
              {formatUsd(balance)}
            </p>
          )}
          <Button
            onClick={() => setShowTopUp(true)}
            className="w-full py-5 sm:py-6 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 text-white flex items-center justify-center gap-2 btn-press ripple-effect transition-all duration-150 active:scale-[0.98] touch-target"
            disabled={userLoading}
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
            <span className="tracking-wider text-sm">RECHARGE NOW</span>
          </Button>
        </div>

        {/* STATS CARD */}
        <div className="glass rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">
              <Package className="w-3.5 h-3.5" /> Total Orders
            </div>
            {ordersLoading ? (
              <Skeleton className="h-9 w-20 rounded-xl" />
            ) : (
              <p className="text-3xl sm:text-4xl font-black tracking-tighter">{orders.length}</p>
            )}
          </div>
          <div className="space-y-2 mt-4">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">System Health</p>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-1 flex-1 bg-emerald-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                </div>
              ))}
            </div>
          </div>
          <Link to="/orders" className="mt-4 block">
            <Button variant="ghost" size="sm" className="w-full rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 font-black text-[10px] touch-target">
              <ShoppingBag className="w-3.5 h-3.5 mr-2" /> VIEW ALL ORDERS
            </Button>
          </Link>
        </div>

        {/* QUICK ACTION CARD */}
        <div className="gradient-primary rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 flex flex-col justify-between shadow-2xl shadow-primary/20 relative overflow-hidden group">
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="space-y-1 relative z-10">
            <p className="text-lg sm:text-xl font-black text-white italic">Store Hub</p>
            <p className="text-white/60 text-xs font-bold">Games & Social Services</p>
          </div>
          <Link to="/home" className="relative z-10">
            <Button variant="secondary" className="mt-4 sm:mt-6 w-full py-5 sm:py-6 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform text-sm touch-target">
              TO STORE <ArrowLeft className="w-4 h-4 ms-2 rotate-180" />
            </Button>
          </Link>
        </div>
      </div>

      {/* PROMO CODE + REFERRAL (side by side on desktop) */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* PROMO CODE */}
        <div className="glass rounded-[2rem] border-white/5 p-5 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">Promo Code</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Redeem for wallet credit</p>
            </div>
          </div>
          <PromoCodeInput onRedeemed={(amount) => {
            if (prevBalanceRef.current !== null) {
              prevBalanceRef.current = prevBalanceRef.current + amount
            }
          }} />
        </div>

        {/* REFERRAL */}
        <div className="glass rounded-[2rem] border-white/5 p-5 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Gift className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="font-black text-sm tracking-tight">Referral Program</p>
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Earn $2 per referral</p>
            </div>
          </div>

          {/* User's own code */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Code</label>
            <div className="flex gap-2">
              <div className="flex-1 h-12 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-center px-4">
                <span className="font-black tracking-widest text-amber-400 text-sm font-mono">
                  {userRow?.referral_code ?? referralStats?.referral_code ?? '...'}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-12 w-12 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10"
                onClick={() => copyReferralCode(userRow?.referral_code ?? referralStats?.referral_code ?? '')}
              >
                {referralCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4">
            <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black tracking-tighter text-amber-400">{referralStats?.total_referrals ?? 0}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mt-1 flex items-center justify-center gap-1">
                <Users className="w-2.5 h-2.5" /> Referrals
              </p>
            </div>
            <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-center">
              <p className="text-2xl font-black tracking-tighter text-emerald-400">
                {formatUsd(referralStats?.total_earned ?? 0)}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50 mt-1">Earned</p>
            </div>
          </div>

          {/* Apply referral code (if user hasn't been referred yet) */}
          {!userRow?.referred_by_id && (
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Have a referral code?</label>
              <div className="flex gap-2">
                <Input
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  placeholder="CEDAR-XXXXXX"
                  className="h-11 rounded-2xl border-white/10 bg-white/5 font-black text-sm tracking-widest"
                />
                <Button
                  onClick={handleApplyReferral}
                  disabled={referralLoading || !referralInput.trim()}
                  className="h-11 px-5 rounded-2xl font-black text-[10px] tracking-widest"
                >
                  {referralLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'APPLY'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WHISH RECHARGE MODAL */}
      {showTopUp && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300"
          onClick={() => setShowTopUp(false)}
        >
          <div
            className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] sm:rounded-[3rem] max-w-md w-full p-6 sm:p-10 space-y-6 sm:space-y-8 shadow-[0_0_100px_rgba(16,185,129,0.1)] max-h-[92dvh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10 shadow-inner group overflow-hidden">
                <img src="/assets/whish-logo.png" alt="Whish Money" className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-500" />
              </div>
              <button onClick={() => setShowTopUp(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black tracking-tighter italic">Recharge via Whish</h2>
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">SEND TRANSFER TO THE NUMBER BELOW</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center space-y-4">
              <div className="flex flex-col items-center gap-4">
                <span className="text-4xl font-black tracking-widest font-mono text-foreground">{WHISH_NUMBER}</span>
                <button
                  onClick={copyNumber}
                  className="flex items-center gap-2 bg-emerald-600/20 text-emerald-500 py-2 px-6 rounded-full text-[10px] font-black border border-emerald-500/30 hover:bg-emerald-600/30 transition-all"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'COPIED' : 'COPY NUMBER'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">How much did you send? ($)</label>
                <Input
                  type="number"
                  placeholder="Ex: 50"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="h-14 bg-white/5 border-white/10 rounded-2xl px-6 text-lg font-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Upload Proof (Screenshot)</label>
                <div className="relative group/file">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`h-24 bg-white/5 border border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group-hover/file:bg-white/[0.08] ${selectedFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10'}`}>
                    {selectedFile ? (
                      <>
                        <FileText className="w-6 h-6 text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase truncate px-4">{selectedFile.name}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase">{t('clickToUpload')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleManualConfirm}
                disabled={submitting || !topUpAmount || !selectedFile}
                className="w-full py-7 rounded-2xl bg-white text-black hover:bg-neutral-200 font-black text-md flex items-center justify-center gap-3 transition-all mt-4"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {submitting ? 'NOTIFYING...' : 'CONFIRM TRANSFER'}
              </Button>

              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="block text-center mt-2">
                <p className="text-[9px] font-black text-muted-foreground underline hover:text-white transition-opacity">Problems? Message Support</p>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* RECENT PENDING REQUESTS */}
      {topUps.length > 0 && (
        <div className="glass rounded-[2rem] border-white/5 shadow-xl overflow-hidden">
          <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Recent Recharge Requests</h3>
          </div>
          <div className="divide-y divide-white/5">
            {topUps.map((tu: any) => (
              <div key={tu.id} className="px-5 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between gap-3 hover:bg-white/[0.01] transition-colors">
                <div className="min-w-0">
                  <p className="font-bold text-sm tracking-tight truncate">{formatUsd(Number(tu.amount))} Whish Transfer</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                    {format(new Date(tu.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={tu.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRANSACTION HISTORY */}
      <div className="glass rounded-[2rem] sm:rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-hidden">
        <div className="px-5 sm:px-8 py-5 sm:py-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <h2 className="font-black text-xl sm:text-2xl flex items-center gap-3 sm:gap-4 italic tracking-tighter">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" /> HUB LOGS
          </h2>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 self-start sm:self-auto">
            {(['all', 'credit', 'debit'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setTxFilter(f); setTxLimit(15) }}
                className={`px-4 sm:px-6 py-2 rounded-xl text-[9px] font-black transition-all touch-target min-h-0 ${
                  txFilter === f
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105'
                    : 'text-muted-foreground hover:bg-white/5'
                }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {txLoading ? (
          <div className="p-5 sm:p-8 space-y-3 sm:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : (() => {
          const filtered = transactions.filter((tx: any) =>
            txFilter === 'all' ? true : (tx.direction ?? 'debit') === txFilter
          )
          const visible = filtered.slice(0, txLimit)

          if (filtered.length === 0) {
            return (
              <div className="py-16 px-8 sm:p-24 text-center text-muted-foreground text-xs font-black uppercase tracking-[0.3em] opacity-20 italic">
                No logs found.
              </div>
            )
          }

          return (
            <>
              <div className="divide-y divide-white/5">
                {visible.map((tx: any) => {
                  const txDir = (tx.direction ?? 'debit') as 'credit' | 'debit' | 'neutral'
                  const isCredit = txDir === 'credit'
                  const isNeutral = txDir === 'neutral' || tx.status === 'rejected'

                  return (
                    <div key={tx.id} className="flex items-center gap-3 sm:gap-6 px-4 sm:px-10 py-4 sm:py-6 hover:bg-white/[0.01] transition-colors group">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                        isNeutral
                          ? 'bg-muted border-white/5 text-muted-foreground shadow-inner'
                          : isCredit
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
                            : 'bg-destructive/5 border-destructive/10 text-destructive shadow-[0_0_20px_rgba(239,68,68,0.05)]'
                      }`}>
                        {isNeutral ? <Minus className="w-4 h-4" /> : isCredit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-black text-[12px] sm:text-[13px] tracking-tight truncate group-hover:translate-x-1 transition-transform">
                          {tx.description ?? tx.method}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-black mt-0.5 uppercase tracking-widest opacity-40">
                          {tx.created_at ? format(new Date(tx.created_at), 'MMM d, HH:mm') : '—'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`font-black text-sm sm:text-lg tabular-nums tracking-tighter ${isNeutral ? 'text-muted-foreground' : isCredit ? 'text-emerald-500' : 'text-destructive'}`}>
                          {isNeutral ? '' : isCredit ? '+' : '−'}{formatUsd(Number(tx.amount))}
                        </p>
                        <div className="mt-1 sm:mt-2 flex justify-end">
                          <StatusBadge status={tx.status} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {filtered.length > txLimit && (
                <div className="p-6 sm:p-10 text-center">
                  <Button
                    variant="ghost"
                    className="text-[10px] font-black tracking-widest text-muted-foreground hover:text-primary transition-colors touch-target"
                    onClick={() => setTxLimit((l) => l + 15)}
                  >
                    LOAD MORE LOGS
                  </Button>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
