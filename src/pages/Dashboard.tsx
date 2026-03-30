import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Wallet, Clock, ArrowRight, ArrowLeft, Package, Plus, Copy, Check, X, TrendingUp, TrendingDown, Minus, ChevronDown, MessageCircle, Phone, Send, Upload, FileText, Loader2 } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import StatusBadge from '@/components/StatusBadge'
import { useLanguage } from '@/i18n/LanguageContext'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { formatUsd } from '@/lib/formatCurrency'

export default function Dashboard() {
  const { user, session } = useAuth()
  const { t, dir } = useLanguage()
  const queryClient = useQueryClient()
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [txFilter, setTxFilter] = useState<'all' | 'credit' | 'debit'>('all')
  const [txLimit, setTxLimit] = useState(15)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const WHISH_NUMBER = "70-126177"
  const WHATSAPP_LINK = `https://wa.me/96170126177?text=Hello Charbel, I just sent a Whish transfer of ${topUpAmount}$ for my account ${user?.email}`

  const { data: userRow, isLoading: userLoading } = useQuery({
    queryKey: ['users', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('users').select('balance').eq('id', user!.id).single()
      if (error) throw error
      return data
    },
    enabled: !!session && !!user?.id,
  })

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

  // Recently pending topups to show status
  const { data: topUps = [] } = useQuery({
    queryKey: ['topups', user?.id],
    queryFn: async () => {
       // @ts-ignore
       const { data, error } = await supabase.from('deposit_requests').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5);
       if (error) throw error;
       return data || [];
    },
    enabled: !!session && !!user?.id,
  });

  const balance = userRow?.balance ?? 0

  const copyNumber = () => {
    navigator.clipboard.writeText(WHISH_NUMBER)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Whish Number Copied!")
  }

  const handleManualConfirm = async () => {
    const amount = parseFloat(topUpAmount)
    if (!amount || amount <= 0) return toast.error("Please enter a valid amount.");
    if (!selectedFile) return toast.error("Please upload payment proof (image).");
    
    setSubmitting(true)
    try {
      // 1. Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user?.id}/${Math.random()}.${fileExt}`;
      const filePath = `proofs/${fileName}`;

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('receipts')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      // 3. Create deposit request
      // @ts-ignore
      const { error } = await supabase.from('deposit_requests').insert({
        user_id: user?.id,
        amount,
        method: 'WISH',
        status: 'pending',
        proof: publicUrl // Store the ACTUAL image URL
      })
      if (error) throw error

      toast.success("Request Sent! Admin will verify your receipt shortly.")
      setShowTopUp(false)
      setTopUpAmount('')
      setSelectedFile(null)
      // @ts-ignore
      queryClient.invalidateQueries({ queryKey: ['deposit_requests'] })
    } catch (err: any) {
      toast.error(err.message || "Failed to submit request.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) return toast.error("File size is too large (max 5MB)");
      setSelectedFile(file);
    }
  }

  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black tracking-tighter">My Hub Center</h1>
           <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-60">
              User ID: {user?.id?.substring(0, 8)}...
           </p>
        </div>
        <div className="flex items-center gap-3">
            <Link to="/home">
              <Button variant="outline" size="sm" className="rounded-full px-5 border-white/5 bg-white/5 hover:bg-white/10 font-black text-[10px]">
                <ArrowLeft className="w-3.5 h-3.5 mr-2" /> EXIT TO HOME
              </Button>
            </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* BALANCE CARD */}
        <div className="relative overflow-hidden glass rounded-[2.5rem] p-8 glow shadow-2xl border-white/5 group">
          <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-700">
             <Wallet className="w-32 h-32" />
          </div>
          <div className="flex items-center gap-3 text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Balance
          </div>
          {userLoading ? (
            <Skeleton className="h-12 w-48 rounded-2xl" />
          ) : (
            <p className="text-5xl font-black tracking-tighter mb-8">{formatUsd(balance)}</p>
          )}
          <Button
            onClick={() => setShowTopUp(true)}
            className="w-full py-6 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 text-white flex items-center justify-center gap-2"
            disabled={userLoading}
          >
            <Plus className="w-5 h-5" /> RECHARGE NOW
          </Button>
        </div>

        {/* STATS CARD */}
        <div className="glass rounded-[2.5rem] p-8 border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">
                <Package className="w-3.5 h-3.5" /> Total Orders
            </div>
            {ordersLoading ? (
                <Skeleton className="h-10 w-24 rounded-xl" />
            ) : (
                <p className="text-4xl font-black tracking-tighter">{orders.length}</p>
            )}
          </div>
          <div className="space-y-2 mt-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">System Health</p>
              <div className="flex gap-1">
                 {[...Array(5)].map((_, i) => <div key={i} className="h-1 flex-1 bg-emerald-500/20 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 animate-pulse" style={{ animationDelay: `${i*0.1}s` }} /></div>)}
              </div>
          </div>
        </div>

        {/* QUICK ACTION CARD */}
        <div className="gradient-primary rounded-[2.5rem] p-8 flex flex-col justify-between shadow-2xl shadow-primary/20 relative overflow-hidden group">
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="space-y-1 relative z-10">
            <p className="text-xl font-black text-white italic">Store Hub</p>
            <p className="text-white/60 text-xs font-bold">Games & Social Services</p>
          </div>
          <Link to="/home" className="relative z-10">
            <Button variant="secondary" className="mt-6 w-full py-6 rounded-2xl font-black shadow-lg hover:scale-[1.02] transition-transform">
              DRIVE TO STORE <ArrowIcon className="w-4 h-4 ms-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* WHISH RECHARGE MODAL */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300" onClick={() => setShowTopUp(false)}>
          <div className="bg-[#0a0a0a] border border-white/10 rounded-[3rem] max-w-md w-full p-10 space-y-8 shadow-[0_0_100px_rgba(16,185,129,0.1)]" onClick={(e) => e.stopPropagation()}>
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
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">SEND Transfer TO THE NUMBER BELOW</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-center space-y-4">
                <div className="flex flex-col items-center gap-4">
                    <span className="text-4xl font-black tracking-widest font-mono text-foreground">{WHISH_NUMBER}</span>
                    <button onClick={copyNumber} className="flex items-center gap-2 bg-emerald-600/20 text-emerald-500 py-2 px-6 rounded-full text-[10px] font-black border border-emerald-500/30 hover:bg-emerald-600/30 transition-all">
                       {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                       {copied ? "COPIED" : "COPY NUMBER"}
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
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} {submitting ? "NOTIFYING..." : "CONFIRM TRANSFER"}
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
          <div className="glass rounded-[2rem] border-white/5 shadow-xl overflow-hidden mb-6">
             <div className="px-8 py-5 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Recent Recharge Requests</h3>
             </div>
             <div className="divide-y divide-white/5">
                {topUps.map((tu: any) => (
                    <div key={tu.id} className="px-8 py-4 flex items-center justify-between">
                        <div>
                            <p className="font-bold text-sm tracking-tight">{formatUsd(Number(tu.amount))} Whish Transfer</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-50">{format(new Date(tu.created_at), 'MMM d, HH:mm')}</p>
                        </div>
                        <StatusBadge status={tu.status} />
                    </div>
                ))}
             </div>
          </div>
      )}

      {/* TRANSACTION HISTORY */}
      <div className="glass rounded-[2.5rem] border-white/5 shadow-2xl relative overflow-hidden">
        <div className="px-8 py-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <h2 className="font-black text-2xl flex items-center gap-4 italic tracking-tighter">
            <Clock className="w-6 h-6 text-primary" /> HUB LOGS
          </h2>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
            {(['all', 'credit', 'debit'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setTxFilter(f); setTxLimit(15) }}
                className={`px-6 py-2 rounded-xl text-[9px] font-black transition-all ${
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
          <div className="p-8 space-y-4">
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
            return <div className="p-24 text-center text-muted-foreground text-xs font-black uppercase tracking-[0.3em] opacity-20 italic">No logs found.</div>
          }

          return (
            <>
              <div className="divide-y divide-white/5">
                {visible.map((tx: any) => {
                  const dir = (tx.direction ?? 'debit') as 'credit' | 'debit' | 'neutral'
                  const isCredit = dir === 'credit'
                  const isNeutral = dir === 'neutral' || tx.status === 'rejected'

                  return (
                    <div key={tx.id} className="flex items-center gap-6 px-10 py-6 hover:bg-white/[0.01] transition-colors group">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                        isNeutral
                          ? 'bg-muted border-white/5 text-muted-foreground shadow-inner'
                          : isCredit
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
                            : 'bg-destructive/5 border-destructive/10 text-destructive shadow-[0_0_20px_rgba(239,68,68,0.05)]'
                      }`}>
                        {isNeutral ? <Minus className="w-5 h-5" /> : isCredit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>

                      <div className="flex-1">
                        <p className="font-black text-[13px] tracking-tight group-hover:translate-x-1 transition-transform">{tx.description ?? tx.method}</p>
                        <p className="text-[10px] text-muted-foreground font-black mt-1 uppercase tracking-widest opacity-40">
                          {tx.created_at ? format(new Date(tx.created_at), 'MMM d, HH:mm') : '—'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className={`font-black text-lg tabular-nums tracking-tighter ${isNeutral ? 'text-muted-foreground' : isCredit ? 'text-emerald-500' : 'text-destructive'}`}>
                          {isNeutral ? '' : isCredit ? '+' : '−'}{formatUsd(Number(tx.amount))}
                        </p>
                        <div className="mt-2 flex justify-end">
                          <StatusBadge status={tx.status} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              {filtered.length > txLimit && (
                 <div className="p-10 text-center">
                    <Button variant="ghost" className="text-[10px] font-black tracking-widest text-muted-foreground hover:text-primary transition-colors" onClick={() => setTxLimit(l => l + 15)}>LOAD MORE LOGS</Button>
                 </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
