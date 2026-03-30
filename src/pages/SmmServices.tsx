import React, { useState, useEffect, useMemo, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, CheckCircle2, AlertCircle, ShoppingCart, Layers, ChevronDown, Flame, SearchX, Rocket } from 'lucide-react';
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
    <div className="group flex flex-col bg-card border border-border rounded-xl overflow-hidden hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300">
      <div className="p-4 border-b border-border relative overflow-hidden">
        <div className="flex justify-between items-start mb-2 gap-2">
          <span className="inline-flex items-center px-2 py-1 rounded bg-secondary text-secondary-foreground text-[10px] font-black tracking-widest uppercase">
            ID: {service.service_id}
          </span>
          <div className="text-right">
            <span className="text-xl font-extrabold text-primary tracking-tight leading-none">
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
          <input type="url" placeholder="Target URL..." value={link} onChange={(e) => { setLink(e.target.value); setError(null); }} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-primary" />
          <input type="number" placeholder={`Qty: e.g. ${service.min}`} value={qty} min={service.min} max={service.max} onChange={(e) => { setQty(e.target.value ? Number(e.target.value) : ''); setError(null); }} className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm font-mono focus:ring-1 focus:ring-primary" />
          {previewCost > 0 && <p className="text-xs font-bold text-emerald-500 text-right">Cost: ${previewCost.toFixed(3)}</p>}
        </div>
        {error && <div className="text-[11px] font-bold text-destructive bg-destructive/10 px-2 py-1 rounded flex gap-1"><AlertCircle className="w-3 h-3"/> {error}</div>}
        {success && <div className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded flex gap-1"><CheckCircle2 className="w-3 h-3"/> {success}</div>}
      </div>
      <div className="p-4 pt-0">
        <button onClick={handleOrder} disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-bold shadow-md hover:opacity-90 transition-all disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ShoppingCart className="w-4 h-4" /> Place Order</>}
        </button>
      </div>
    </div>
  );
});

const ITEMS_PER_PAGE = 30;

export default function SmmServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  useEffect(() => {
    // RESTORE ALL: Fetch all services BUT filter out Chat Apps
    const chatAppKeywords = ['Xena', 'YoHo', 'SoulStar', 'WhatsApp', 'Telegram', 'Messenger', 'IMOU', 'Azar'];
    // @ts-ignore
    let query = supabase.from('smm_services').select('*').limit(2000).order('rate', { ascending: true });
    
    // @ts-ignore
    query.then(({ data }: { data: any[] | null }) => {
      if (data) {
        // Filter out chat apps locally to leave "the others"
        const others = data.filter(s => 
          !chatAppKeywords.some(k => s.name.toLowerCase().includes(k.toLowerCase()))
        );
        setServices(others);
        if (others.length > 0) setActiveCategory("Popular Services");
      }
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(services.map(s => s.category))).sort();
    return ['Popular Services', ...cats];
  }, [services]);

  const filteredServices = useMemo(() => {
    setVisibleCount(ITEMS_PER_PAGE);
    let filtered = services;
    if (activeCategory === 'Popular Services') {
        filtered = [...services].sort((a,b) => Number(a.rate) - Number(b.rate));
    } else if (activeCategory) {
        filtered = services.filter(s => s.category === activeCategory);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q) || String(s.service_id).includes(q) || s.category.toLowerCase().includes(q));
    }
    return filtered;
  }, [services, activeCategory, debouncedSearch]);

  const currentlyVisible = filteredServices.slice(0, visibleCount);

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <Rocket className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black">SMM Engine</h1>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs mt-1">Growth Services</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-card border border-border rounded-xl p-4 sticky top-20 max-h-[75vh] overflow-y-auto no-scrollbar shadow-sm">
            <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4 ml-1">Categories</h3>
            <div className="space-y-1">
              {categories.map((cat: any) => (
                <button key={cat} onClick={() => { setActiveCategory(cat); setSearchQuery(''); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${activeCategory === cat ? 'bg-primary text-primary-foreground font-black' : 'text-muted-foreground hover:bg-muted font-bold'}`}>
                  {cat === 'Popular Services' ? `🔥 ${cat}` : cat}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="Search growth services..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-sm" />
            </div>
          </div>

          {loading ? (
            <DashboardSkeletonGrid />
          ) : filteredServices.length === 0 ? (
            <div className="py-20 text-center"><SearchX className="w-10 h-10 text-muted-foreground mx-auto mb-4" /><p className="font-bold">No growth services found.</p></div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentlyVisible.map(service => <ServiceCard key={service.service_id} service={service} onOrderSuccess={() => window.dispatchEvent(new CustomEvent('balance-refresh-needed'))} />)}
              </div>
              {visibleCount < filteredServices.length && (
                <div className="mt-8 text-center">
                  <button onClick={() => setVisibleCount(v => v + ITEMS_PER_PAGE)} className="px-8 py-2.5 bg-muted hover:bg-primary hover:text-white text-foreground rounded-full text-xs font-black shadow-sm inline-flex items-center gap-2 transition-all uppercase tracking-widest"><ChevronDown className="w-4 h-4"/> Load More Services</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
