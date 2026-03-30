import React, { useState, useEffect, useMemo, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, CheckCircle2, AlertCircle, ShoppingCart, ChevronDown, Flame, SearchX, Rocket, MessageCircle } from 'lucide-react';
import { DashboardSkeletonGrid } from '../components/Skeletons';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const ServiceCard = memo(({ service, onOrderSuccess }: any) => {
  const [link, setLink] = useState('');
  const [qty, setQty] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const finalRate = Number(service.rate);
  const previewCost = (typeof qty === 'number' && qty > 0) ? (finalRate / 1000) * qty : 0;

  const handleOrder = async () => {
    if (!link.trim()) return setError("Target URL is required.");
    const numQty = Number(qty);
    if (!numQty || numQty < Number(service.min) || numQty > Number(service.max)) {
      return setError(`Quantity must be between ${service.min} and ${service.max}`);
    }

    setLoading(true); setError(null); setSuccess(null);
    const requestId = crypto.randomUUID();

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        throw new Error("User not authenticated. Please log in first.");
      }

      const { data, error: invokeError } = await supabase.functions.invoke('secure-order-placement', {
        body: { service_id: service.service_id, link: link.trim(), quantity: numQty, request_id: requestId },
      });

      if (invokeError) throw new Error(invokeError.message || "Network Error.");
      if (data?.error || !data?.success) throw new Error(data?.error || "Transaction Failed.");

      setSuccess(`Order #${data.order_id?.substring(0,6)} Placed Successfully!`);
      setLink(''); setQty('');
      onOrderSuccess(); 
      setTimeout(() => setSuccess(null), 6000);
    } catch (err: any) {
      console.error("Function error:", err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-emerald-500/5 hover:-translate-y-1 transition-all duration-300">
      <div className="p-4 border-b border-border relative overflow-hidden bg-emerald-500/5">
        <div className="flex justify-between items-start mb-2 gap-2">
          <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-black tracking-widest uppercase border border-emerald-500/20">
            {service.category.replace('🎮 ', '').substring(0, 18)}
          </span>
          <div className="text-right">
            <span className="text-xl font-extrabold text-foreground tracking-tight leading-none">
              ${finalRate.toFixed(3)}
            </span>
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Per 1,000</p>
          </div>
        </div>
        <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2 h-10">{service.name}</h3>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between text-[11px] font-bold px-3 py-1.5 bg-muted rounded-md text-muted-foreground uppercase tracking-widest">
          <span>Min: {service.min}</span>
          <div className="w-px h-3 bg-border"></div>
          <span>Max: {service.max}</span>
        </div>
        <div className="space-y-2">
          <input type="url" placeholder="Target URL/Account..." value={link} onChange={(e) => { setLink(e.target.value); setError(null); }} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-emerald-500 transition-all outline-none" />
          <input type="number" placeholder={`Qty: e.g. ${service.min}`} value={qty} min={service.min} max={service.max} onChange={(e) => { setQty(e.target.value ? Number(e.target.value) : ''); setError(null); }} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:ring-1 focus:ring-emerald-500 transition-all outline-none" />
          {previewCost > 0 && <p className="text-xs font-bold text-emerald-500 text-right font-black">Cost: ${previewCost.toFixed(3)}</p>}
        </div>
        {error && <div className="text-[11px] font-bold text-destructive bg-destructive/10 px-2 py-1 rounded flex gap-1"><AlertCircle className="w-3 h-3"/> {error}</div>}
        {success && <div className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded flex gap-1"><CheckCircle2 className="w-3 h-3"/> {success}</div>}
      </div>
      <div className="p-4 pt-0">
        <button onClick={handleOrder} disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-md text-sm font-black shadow-md hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4" /> Buy Now</>}
        </button>
      </div>
    </div>
  );
});

const ITEMS_PER_PAGE = 30;

export default function CharbelCardPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    const chatAppKeywords = ['Xena', 'YoHo', 'SoulStar', 'WhatsApp', 'Telegram', 'Messenger', 'IMOU', 'Azar'];
    // @ts-ignore
    let query = supabase.from('smm_services').select('*').limit(2000).order('rate', { ascending: true });
    
    const filterString = chatAppKeywords.map(k => `name.ilike.%${k}%`).join(',');
    query = query.or(filterString);

    // @ts-ignore
    query.then(({ data }) => {
      if (data) { 
        setServices(data); 
        setActiveCategory("Chat Apps"); 
      }
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => ['Chat Apps'], []);

  const filteredServices = useMemo(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    let filtered = services;
    if (activeCategory === 'Chat Apps') filtered = [...services].sort((a,b) => Number(a.rate) - Number(b.rate));
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || String(s.service_id).includes(q) || s.category.toLowerCase().includes(q));
    }
    return filtered;
  }, [services, activeCategory, debouncedSearch]);

  const currentlyVisible = filteredServices.slice(0, visibleCount);

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* NEW HEADER FOR HUB */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-card/40 p-6 rounded-[2.5rem] border border-border/50 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl border border-emerald-500/20 shadow-inner group">
               <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">Charbel HUB</h1>
              <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[8px] mt-1 ml-0.5 opacity-60 flex items-center gap-2">
                 <Rocket className="w-2 h-2 text-emerald-500" /> Chat & Messaging Platform
              </p>
            </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* SIDE CATEGORIES */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-card border border-border rounded-[2.5rem] p-6 sticky top-24 shadow-sm">
            <h3 className="font-black text-[9px] uppercase tracking-widest text-muted-foreground mb-6 ml-1 flex items-center gap-2.5 opacity-80">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Categories
            </h3>
            <div className="space-y-2">
              {categories.map((cat: any) => (
                <button 
                    key={cat} 
                    onClick={() => { setActiveCategory(cat); setSearchQuery(''); }} 
                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-[12px] transition-all border ${activeCategory === cat ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-600 font-black shadow-inner translate-x-1' : 'border-transparent text-muted-foreground hover:bg-muted font-bold'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* PRODUCTS AREA */}
        <div className="flex-1">
          <div className="mb-10">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-emerald-500 transition-all duration-300" />
              <input type="text" placeholder="Search for chat services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-card border border-border rounded-[2rem] text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all shadow-sm group-hover:shadow-lg" />
            </div>
          </div>

          {loading ? (
            <DashboardSkeletonGrid />
          ) : currentlyVisible.length === 0 ? (
            <div className="py-24 text-center">
                <SearchX className="w-10 h-10 text-muted-foreground/30 mx-auto mb-6" />
                <p className="font-black text-muted-foreground text-lg">No Chat Services Found.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentlyVisible.map(service => <ServiceCard key={service.service_id} service={service} onOrderSuccess={() => window.dispatchEvent(new CustomEvent('balance-refresh-needed'))} />)}
              </div>
              
              {visibleCount < filteredServices.length && (
                <div className="mt-16 text-center">
                  <button onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)} className="px-12 py-4 bg-muted/50 text-foreground hover:bg-emerald-600 hover:text-white rounded-[2rem] text-[10px] font-black shadow-xl tracking-widest inline-flex items-center gap-3 transition-all ring-1 ring-border border border-border">
                    <ChevronDown className="w-4 h-4"/> LOAD MORE APPS
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
