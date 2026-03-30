import React, { useState, useEffect, useMemo, memo } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Loader2, CheckCircle2, AlertCircle, ShoppingCart, ChevronDown, SearchX, Gamepad2, MessageCircle, Laptop, Package, Gem, Zap } from 'lucide-react';
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
  const previewCost = (typeof qty === 'number' && qty > 0) ? finalRate * qty : 0;

  const handleOrder = async () => {
    if (!link.trim()) return setError("ID or Player Info is required.");
    const numQty = Number(qty);
    if (!numQty || numQty < Number(service.min) || numQty > Number(service.max)) {
      return setError(`Quantity must be between ${service.min} and ${service.max}`);
    }

    setLoading(true); setError(null); setSuccess(null);
    const requestId = crypto.randomUUID();

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("User not authenticated.");

      const { data, error: invokeError } = await supabase.functions.invoke('sahl-cash-proxy', {
        body: { 
          action: 'order',
          product_id: service.service_id.replace('sahl_', ''), 
          params: { playerId: link.trim() }, 
          quantity: numQty, 
          order_uuid: requestId 
        },
      });

      if (invokeError) throw new Error(invokeError.message);
      if (data?.status === 'error' || data?.error) throw new Error(data?.message || data?.error || "Failed.");

      setSuccess(`Order Placed Successfully!`);
      setLink(''); setQty('');
      onOrderSuccess(); 
      setTimeout(() => setSuccess(null), 6000);
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const getThemeColor = () => {
    if (service.rootType === 'Chat Apps') return 'emerald';
    if (service.rootType === 'Games Store') return 'blue';
    return 'purple';
  };

  const theme = getThemeColor();

  return (
    <div className={`group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1`}>
      <div className={`p-4 border-b border-border relative overflow-hidden bg-${theme}-500/5 text-center`}>
        <div className="flex justify-between items-start mb-2 gap-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black tracking-tighter uppercase border border-${theme}-500/10 text-${theme}-600 bg-${theme}-500/5`}>
            {service.category.replace('🎮 ', '').substring(0, 18)}
          </span>
          <div className="text-right">
            <span className="text-lg font-extrabold text-foreground tracking-tight">${finalRate.toFixed(3)}</span>
          </div>
        </div>
        <h3 className="font-bold text-[11px] text-foreground leading-snug line-clamp-2 h-7">{service.name}</h3>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-0.5">Player ID / Account</label>
            <input type="text" placeholder="Enter ID..." value={link} onChange={(e) => { setLink(e.target.value); setError(null); }} className={`w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-${theme}-500 transition-all outline-none`} />
            
            <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground ml-0.5 mt-1 block">Quantity</label>
            <input type="number" placeholder={`Min: ${service.min}`} value={qty} onChange={(e) => { setQty(e.target.value ? Number(e.target.value) : ''); setError(null); }} className={`w-full px-3 py-2 bg-background border border-border rounded-lg text-sm font-mono focus:ring-1 focus:ring-${theme}-500 transition-all outline-none`} />
            
            {previewCost > 0 && <p className={`text-[10px] font-black text-${theme}-500 text-right`}>Total: ${previewCost.toFixed(3)}</p>}
        </div>
        {error && <div className="text-[9px] font-bold text-destructive bg-destructive/5 p-2 rounded-lg flex gap-1 animate-shake"><AlertCircle className="w-3 h-3"/> {error}</div>}
        {success && <div className={`text-[9px] font-bold text-emerald-500 bg-emerald-500/5 p-2 rounded-lg flex gap-1`}><CheckCircle2 className="w-3 h-3"/> {success}</div>}
      </div>
      <div className="p-4 pt-0">
        <button onClick={handleOrder} disabled={loading} className={`w-full flex items-center justify-center gap-2 py-2.5 bg-${theme}-600 text-white rounded-lg text-[11px] font-black shadow-md hover:bg-${theme}-700 active:scale-95 transition-all disabled:opacity-50`}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-3.5 h-3.5" /> Buy Now</>}
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
  const [activeRootType, setActiveRootType] = useState('Chat Apps'); 
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const getRootType = (catName: string) => {
    const name = catName.toLowerCase();
    
    // PRIORITY 1: CHAT APPS
    const chatKeywords = [
        'yoho', 'xena', 'soulstar', 'mico', 'yalla', 'ahlan', 'partying', 'livu', 'hago', 'chammet', 
        'bigo', 'tango', 'sugo', 'weplay', 'lita', 'topu', 'imo', 'discord', 'telegram', 'badoo', 
        'soul', 'wechat', 'line', 'kumu', 'live me', 'voicelive', 'uplive', 'star live', 'ola party'
    ];
    if (chatKeywords.some(k => name.includes(k))) return 'Chat Apps';

    // PRIORITY 2: GAMES
    const gameKeywords = [
        'pubg', 'freefire', 'free fire', 'mlbb', 'mobile legends', 'roblox', 'steam', 'playstation', 
        'psn', 'xbox', 'nintendo', 'call of duty', 'cod', 'riot', 'valorant', 'league', 'garena', 
        'uc ', 'diamonds', 'u8', 'u6', 'u2', 'fortnite', 'minecraft', 'apex', 'codm', 'cp ', 'gems', 
        'golds', 'coins', 'jewels', 'razor', 'mobile legends', 'e-coins', 'clash'
    ];
    if (gameKeywords.some(k => name.includes(k))) return 'Games Store';

    // DEFAULT: TOOLS
    return 'Tools & Vouchers';
  };

  useEffect(() => {
    // @ts-ignore
    supabase.from('smm_services').select('*').ilike('service_id', 'sahl_%').order('rate', { ascending: true })
      .then(({ data }) => {
        if (data) {
           const mapped = data.map(s => ({ ...s, rootType: getRootType((s as any).category) }));
           setServices(mapped);
           // @ts-ignore
           const firstCat = mapped.find(s => s.rootType === 'Chat Apps')?.category;
           if (firstCat) setActiveCategory(firstCat);
        }
        setLoading(false);
      });
  }, []);

  const rootTypes = [
    { label: 'Chat Apps', icon: MessageCircle, color: 'emerald' },
    { label: 'Games Store', icon: Gamepad2, color: 'blue' },
    { label: 'Tools & Vouchers', icon: Package, color: 'purple' }
  ];
  
  const subCategories = useMemo(() => {
    // @ts-ignore
    const cats = Array.from(new Set(services.filter(s => s.rootType === activeRootType).map(s => s.category))).sort();
    return cats;
  }, [services, activeRootType]);

  useEffect(() => {
     if (subCategories.length > 0) setActiveCategory(subCategories[0]);
     else setActiveCategory(null);
  }, [activeRootType, subCategories]);

  const filteredServices = useMemo(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    let filtered = services.filter(s => s.rootType === activeRootType);
    if (activeCategory) filtered = filtered.filter(s => s.category === activeCategory);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || String(s.service_id).includes(q) || s.category.toLowerCase().includes(q));
    }
    return filtered;
  }, [services, activeRootType, activeCategory, debouncedSearch]);

  const currentlyVisible = filteredServices.slice(0, visibleCount);

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-card/40 p-6 rounded-[2.5rem] border border-border/50 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-5">
            <div className="p-4 bg-primary/10 text-primary rounded-2xl border border-primary/20 shadow-inner relative overflow-hidden group">
               <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity" />
               <Zap className="w-7 h-7 relative" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">Charbel HUB</h1>
              <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[8px] mt-1 ml-0.5 flex items-center gap-1.5 opacity-60">
                 <Gem className="w-2 h-2" /> Digital Assets Exchange
              </p>
            </div>
        </div>

        {/* ROOT TYPE SELECTOR */}
        <div className="flex bg-muted/30 p-1.5 rounded-3xl border border-border/60 shadow-inner max-w-sm w-full md:w-auto overflow-x-auto no-scrollbar">
            {rootTypes.map(type => (
                <button
                    key={type.label}
                    onClick={() => setActiveRootType(type.label)}
                    className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-5 rounded-2xl text-[10px] font-black transition-all duration-500 ${activeRootType === type.label ? `bg-${type.color}-600 text-white shadow-xl shadow-${type.color}-600/20 scale-105` : 'text-muted-foreground hover:bg-muted'}`}
                >
                    <type.icon className="w-3.5 h-3.5" />
                    {type.label}
                </button>
            ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* SUB-CATEGORIES ASIDE */}
        <aside className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-card border border-border rounded-[2.5rem] p-6 sticky top-24 max-h-[75vh] overflow-y-auto no-scrollbar shadow-sm">
            <h3 className="font-black text-[9px] uppercase tracking-widest text-muted-foreground mb-6 ml-1 flex items-center gap-2.5 opacity-80">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Sub Categories
            </h3>
            <div className="space-y-2">
              {subCategories.length > 0 ? subCategories.map((cat: any) => (
                <button 
                    key={cat} 
                    onClick={() => { setActiveCategory(cat); setSearchQuery(''); }} 
                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-[12px] transition-all border ${activeCategory === cat ? 'bg-primary/5 border-primary/30 text-primary font-black shadow-inner translate-x-1' : 'border-transparent text-muted-foreground hover:bg-muted font-bold'}`}
                >
                  {cat.replace('🎮 ', '').replace('PUBG', '🎮 PUBG').replace('Whish', '💵 Whish')}
                </button>
              )) : (
                <p className="text-xs text-muted-foreground italic ml-1 opacity-50">Empty category.</p>
              )}
            </div>
          </div>
        </aside>

        {/* PRODUCTS GRID */}
        <div className="flex-1">
          <div className="mb-10">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
              <input type="text" placeholder={`Search in ${activeRootType}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-card border border-border rounded-[2rem] text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm group-hover:shadow-lg" />
            </div>
          </div>

          {loading ? (
            <DashboardSkeletonGrid />
          ) : currentlyVisible.length === 0 ? (
            <div className="py-24 text-center">
                <div className="w-20 h-20 bg-muted/40 rounded-full flex items-center justify-center mx-auto mb-6">
                   <SearchX className="w-10 h-10 text-muted-foreground/30" />
                </div>
                <p className="font-black text-muted-foreground text-lg">Nothing found here.</p>
                <button onClick={() => { setSearchQuery(''); setActiveCategory(subCategories[0]); }} className="mt-4 text-primary text-xs font-black hover:underline underline-offset-8 uppercase tracking-widest">Clear filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {currentlyVisible.map(service => <ServiceCard key={service.service_id} service={service} onOrderSuccess={() => window.dispatchEvent(new CustomEvent('balance-refresh-needed'))} />) || []}
              </div>
              
              {visibleCount < filteredServices.length && (
                <div className="mt-16 text-center">
                  <button onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)} className="px-12 py-4 bg-muted/50 text-foreground hover:bg-primary hover:text-white rounded-[2rem] text-[10px] font-black shadow-xl tracking-widest inline-flex items-center gap-3 transition-all ring-1 ring-border group border border-border">
                    <ChevronDown className="w-4 h-4 group-hover:translate-y-1 transition-transform"/> VIEW MORE PRODUCTS
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
