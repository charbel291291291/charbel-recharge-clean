import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Shield, RefreshCw, CheckCircle2, XCircle, Clock, Users as UsersIcon,
  DollarSign, Activity, LayoutDashboard, ShoppingCart, ListOrdered,
  Edit, Search, Settings, BarChart2, TrendingUp, Zap, Trash2,
  CheckSquare, Square, AlertTriangle, Package, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `$${Number(n).toFixed(2)}`;

const STATUS_COLORS: Record<string, string> = {
  completed:  '#10b981',
  processing: '#3b82f6',
  pending:    '#f59e0b',
  canceled:   '#ef4444',
  failed:     '#f97316',
  paid:       '#06b6d4',
  refunded:   '#8b5cf6',
};

const PIE_COLORS = ['#10b981','#3b82f6','#f59e0b','#ef4444','#f97316','#06b6d4','#8b5cf6'];

// ─── Custom tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-xs font-black">
      <p className="text-muted-foreground mb-1 uppercase tracking-widest">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.name?.toLowerCase().includes('revenue') ? fmt(p.value) : p.value}</p>
      ))}
    </div>
  );
};

// ─── Metric card ─────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon: Icon, color, bg, delta }: any) {
  return (
    <div className="bg-card border border-border p-6 rounded-[2rem] flex items-center justify-between hover:scale-[1.02] transition-transform hover:shadow-xl shadow-sm">
      <div>
        <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest mb-2 opacity-80">{label}</p>
        <h3 className="text-3xl lg:text-4xl font-black">{value}</h3>
        {delta !== undefined && (
          <p className={`text-[10px] font-black mt-1 flex items-center gap-1 ${delta >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
            <ArrowUpRight className="w-3 h-3" /> {delta >= 0 ? '+' : ''}{delta} this period
          </p>
        )}
      </div>
      <div className={`p-4 rounded-2xl border ${bg}`}><Icon className={`w-7 h-7 ${color}`} /></div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Core data
  const [metrics, setMetrics]   = useState({ users: 0, balance: 0, pendingDeposits: 0, failedOrders: 0 });
  const [deposits, setDeposits] = useState<any[]>([]);
  const [users, setUsers]       = useState<any[]>([]);
  const [orders, setOrders]     = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Settings
  const [japMarkup, setJapMarkup]           = useState(50);
  const [sahlMarkup, setSahlMarkup]         = useState(30);
  const [autoThreshold, setAutoThreshold]   = useState(0);
  const [savingThreshold, setSavingThreshold] = useState(false);

  // Analytics
  const [analytics, setAnalytics]     = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsDays, setAnalyticsDays]   = useState(30);

  // Bulk order management
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading]       = useState(false);

  // ── Fetch main data ────────────────────────────────────────────────────────
  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [userRes, pendingRes, balanceRes, depRes, usersList, ordersRes, settingsRes] = await Promise.all([
        // @ts-ignore
        supabase.from('users').select('*', { count: 'exact', head: true }),
        // @ts-ignore
        supabase.from('deposit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        // @ts-ignore
        supabase.from('users').select('balance'),
        // @ts-ignore
        supabase.from('deposit_requests').select('*').order('created_at', { ascending: false }).limit(50),
        // @ts-ignore
        supabase.from('users').select('*').order('created_at', { ascending: false }).limit(200),
        // @ts-ignore
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300),
        // @ts-ignore
        supabase.from('app_settings').select('*'),
      ]);

      const totalBalance = balanceRes.data?.reduce((acc: number, u: any) => acc + Number(u.balance || 0), 0) || 0;
      setMetrics({ users: userRes.count || 0, balance: totalBalance, pendingDeposits: pendingRes.count || 0, failedOrders: 0 });
      setDeposits(depRes.data || []);
      setUsers(usersList.data || []);
      setOrders(ordersRes.data || []);

      if (settingsRes.data) {
        const jm  = settingsRes.data.find((s: any) => s.key === 'jap_markup');
        const sm  = settingsRes.data.find((s: any) => s.key === 'sahl_markup');
        const at  = settingsRes.data.find((s: any) => s.key === 'auto_approve_threshold');
        if (jm) setJapMarkup(Number(jm.value));
        if (sm) setSahlMarkup(Number(sm.value));
        if (at) setAutoThreshold(Number(at.value));
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch analytics ────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async (days = analyticsDays) => {
    setAnalyticsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_admin_analytics', { p_days: days });
      if (error) throw error;
      setAnalytics(data);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays]);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);
  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics(analyticsDays);
  }, [activeTab, analyticsDays]);

  // ── Deposit actions ────────────────────────────────────────────────────────
  const handleDeposit = async (id: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        // @ts-ignore
        const { error } = await supabase.rpc('approve_deposit_request', { p_request_id: id });
        if (error) throw error;
      } else {
        // @ts-ignore
        await supabase.from('deposit_requests').update({ status: 'rejected' }).eq('id', id);
      }
      fetchAdminData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // ── Balance edit ───────────────────────────────────────────────────────────
  const updateBalance = async (userId: string, currentBalance: number) => {
    const newBal = prompt('Enter new absolute wallet balance (USD):', String(currentBalance));
    if (newBal !== null && !isNaN(Number(newBal))) {
      // @ts-ignore
      const { error } = await supabase.from('users').update({ balance: Number(newBal) }).eq('id', userId);
      if (error) alert('Error: ' + error.message);
      else fetchAdminData();
    }
  };

  // ── Save setting ───────────────────────────────────────────────────────────
  const saveSetting = async (key: string, value: any) => {
    setLoading(true);
    try {
      // @ts-ignore
      const { error } = await supabase.from('app_settings').upsert({ key, value: String(value), updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
      alert(`Saved ${key}!`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Bulk order operations ──────────────────────────────────────────────────
  const toggleOrder = (id: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o: any) => o.id)));
    }
  };

  const bulkAction = async (action: 'complete' | 'cancel' | 'refund') => {
    if (selectedOrders.size === 0) return;
    const ids = Array.from(selectedOrders);
    if (!confirm(`${action.toUpperCase()} ${ids.length} orders?`)) return;

    setBulkLoading(true);
    try {
      if (action === 'refund') {
        const { data, error } = await supabase.rpc('bulk_refund_orders', { p_order_ids: ids });
        if (error) throw error;
        alert(`Refunded ${data} orders.`);
      } else {
        const status = action === 'complete' ? 'completed' : 'canceled';
        const { data, error } = await supabase.rpc('bulk_update_order_status', {
          p_order_ids: ids,
          p_status:    status,
        });
        if (error) throw error;
        alert(`Updated ${data} orders to ${status}.`);
      }
      setSelectedOrders(new Set());
      fetchAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const filteredUsers  = users.filter(u => (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) || u.id.includes(searchQuery));
  const filteredOrders = orders.filter(o => !searchQuery || users.find(u => u.id === o.user_id)?.email?.includes(searchQuery) || o.id.includes(searchQuery));

  const TABS = [
    { id: 'overview',  label: 'Overview',         icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics',         icon: BarChart2 },
    { id: 'orders',    label: 'Orders',            icon: ShoppingCart },
    { id: 'users',     label: 'Users',             icon: UsersIcon },
    { id: 'deposits',  label: 'Deposits',          icon: DollarSign },
    { id: 'settings',  label: 'Settings',          icon: Settings },
  ];

  return (
    <div className="animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2.5 sm:p-3 bg-gradient-to-br from-red-500/20 to-purple-500/20 text-red-500 rounded-xl border border-red-500/20">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent">Pro Admin Engine</h1>
            <p className="text-muted-foreground text-[10px] sm:text-sm uppercase tracking-widest font-bold mt-0.5">Total System Control</p>
          </div>
        </div>
        <button onClick={fetchAdminData} disabled={loading} className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-card border border-border shadow-sm rounded-xl hover:bg-muted font-bold text-xs sm:text-sm transition-all flex items-center gap-2 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin text-primary' : ''}`} /> <span className="hidden xs:inline">Sync Data</span>
        </button>
      </div>

      {/* Tabs - Scrollable on mobile */}
      <div className="flex overflow-x-auto gap-1.5 mb-6 sm:mb-8 bg-card/60 p-1.5 sm:p-2 rounded-2xl border border-border backdrop-blur-sm shadow-sm no-scrollbar scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-lg scale-[1.02] shadow-primary/20 ring-1 ring-primary/50'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-left-4 duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <MetricCard label="Total Users"      value={metrics.users}            icon={UsersIcon}   color="text-blue-500"    bg="bg-blue-500/10 border-blue-500/20" />
            <MetricCard label="System Liability" value={fmt(metrics.balance)}     icon={DollarSign}  color="text-amber-500"   bg="bg-amber-500/10 border-amber-500/20" />
            <MetricCard label="Pending Deposits" value={metrics.pendingDeposits}  icon={Clock}       color="text-purple-500"  bg="bg-purple-500/10 border-purple-500/20" />
            <MetricCard label="System Health"    value="Operational"              icon={Activity}    color="text-emerald-500" bg="bg-emerald-500/10 border-emerald-500/20" />
          </div>
          <div className="bg-card border border-border rounded-[2rem] p-6 sm:p-8 text-center">
            <Activity className="w-10 h-10 sm:w-12 sm:h-12 text-primary/20 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-lg sm:text-xl font-bold mb-2">System is running normally</h3>
            <p className="text-muted-foreground max-w-sm mx-auto text-xs sm:text-sm px-4">All databases, proxy edges, and CRON logic are properly routed. SMM APIs are live.</p>
          </div>
        </div>
      )}

      {/* ── ANALYTICS ──────────────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
          {/* Period selector */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Period:</span>
            {[7, 14, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => { setAnalyticsDays(d); fetchAnalytics(d); }}
                className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all ${
                  analyticsDays === d ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                }`}
              >
                {d}D
              </button>
            ))}
            <button onClick={() => fetchAnalytics(analyticsDays)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all">
              <RefreshCw className={`w-4 h-4 ${analyticsLoading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            </button>
          </div>

          {analyticsLoading && !analytics ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-card border border-border rounded-[2rem] animate-pulse" />
              ))}
            </div>
          ) : analytics ? (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Total Revenue"    value={fmt(analytics.total_revenue)}   icon={TrendingUp}  color="text-emerald-500" bg="bg-emerald-500/10 border-emerald-500/20" />
                <MetricCard label="Total Orders"     value={analytics.total_orders}         icon={Package}     color="text-blue-500"    bg="bg-blue-500/10 border-blue-500/20" />
                <MetricCard label="New Users"        value={analytics.new_users}            icon={UsersIcon}   color="text-violet-500"  bg="bg-violet-500/10 border-violet-500/20" />
                <MetricCard label="Avg Order Value"  value={fmt(analytics.avg_order_value)} icon={DollarSign}  color="text-amber-500"   bg="bg-amber-500/10 border-amber-500/20" />
              </div>

              {/* Revenue area chart */}
              <div className="bg-card border border-border rounded-[2rem] p-6">
                <h3 className="font-black text-base mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-500" /> Daily Revenue
                </h3>
                {analytics.daily_revenue?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={analytics.daily_revenue}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-10 opacity-40">No revenue data in this period.</p>
                )}
              </div>

              {/* Orders bar + status pie */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Daily orders bar */}
                <div className="bg-card border border-border rounded-[2rem] p-6">
                  <h3 className="font-black text-base mb-6 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-500" /> Daily Orders
                  </h3>
                  {analytics.daily_orders?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={analytics.daily_orders}>
                        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="orders" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground text-sm py-10 opacity-40">No order data.</p>
                  )}
                </div>

                {/* Status breakdown pie */}
                <div className="bg-card border border-border rounded-[2rem] p-6">
                  <h3 className="font-black text-base mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-violet-500" /> Order Status
                  </h3>
                  {analytics.status_breakdown?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={analytics.status_breakdown}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                          label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {analytics.status_breakdown.map((_: any, i: number) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-muted-foreground text-sm py-10 opacity-40">No data.</p>
                  )}
                </div>
              </div>

              {/* Top services */}
              {analytics.top_services?.length > 0 && (
                <div className="bg-card border border-border rounded-[2rem] p-6">
                  <h3 className="font-black text-base mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" /> Top Services by Volume
                  </h3>
                  <div className="space-y-3">
                    {analytics.top_services.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-muted-foreground w-4">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-black">Service #{s.service_id}</span>
                            <span className="text-xs font-black text-emerald-500">{fmt(s.revenue)}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(s.count / analytics.top_services[0].count) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground w-12 text-right">{s.count} orders</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-card border border-border rounded-[2rem] p-20 text-center">
              <BarChart2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground text-sm font-black uppercase tracking-widest opacity-30">No analytics data yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ── ORDERS (with bulk management) ──────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-4 animate-in slide-in-from-left-4 duration-500">
          {/* Search + bulk toolbar */}
          <div className="bg-card border border-border rounded-[2rem] p-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by email or order ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 w-full shadow-sm"
              />
            </div>

            {selectedOrders.size > 0 && (
              <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest px-3 py-2 bg-white/5 rounded-xl">
                  {selectedOrders.size} selected
                </span>
                <button
                  onClick={() => bulkAction('complete')}
                  disabled={bulkLoading}
                  className="px-3 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[11px] font-black hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                </button>
                <button
                  onClick={() => bulkAction('cancel')}
                  disabled={bulkLoading}
                  className="px-3 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-xl text-[11px] font-black hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  onClick={() => bulkAction('refund')}
                  disabled={bulkLoading}
                  className="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-[11px] font-black hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Refund
                </button>
                <button
                  onClick={() => setSelectedOrders(new Set())}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-muted-foreground"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Orders table */}
          <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg">
            <div className="p-5 border-b border-border/50 bg-muted/20 flex items-center justify-between">
              <h2 className="font-bold text-lg flex items-center gap-3">
                <ListOrdered className="w-5 h-5 text-primary" /> Global Orders ({filteredOrders.length})
              </h2>
              {bulkLoading && <RefreshCw className="w-4 h-4 animate-spin text-primary" />}
            </div>
            <div className="table-responsive">
              <table className="w-full text-sm text-left min-w-[800px]">
                <thead className="text-[10px] uppercase bg-muted/40 text-muted-foreground font-black tracking-widest">
                  <tr>
                    <th className="px-4 py-4">
                      <button onClick={toggleSelectAll} className="p-1 hover:text-primary transition-colors">
                        {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0
                          ? <CheckSquare className="w-4 h-4 text-primary" />
                          : <Square className="w-4 h-4" />
                        }
                      </button>
                    </th>
                    <th className="px-4 py-4">Order</th>
                    <th className="px-4 py-4">User</th>
                    <th className="px-4 py-4">Service</th>
                    <th className="px-4 py-4">Cost</th>
                    <th className="px-4 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredOrders.map((o: any) => (
                    <tr key={o.id} className={`hover:bg-muted/30 transition-colors ${selectedOrders.has(o.id) ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-4">
                        <button onClick={() => toggleOrder(o.id)} className="p-1 hover:text-primary transition-colors">
                          {selectedOrders.has(o.id)
                            ? <CheckSquare className="w-4 h-4 text-primary" />
                            : <Square className="w-4 h-4 text-muted-foreground" />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs opacity-60 whitespace-nowrap">#{o.id.substring(0, 8)}</td>
                      <td className="px-4 py-4 text-xs font-bold">{users.find(u => u.id === o.user_id)?.email || o.user_id?.substring(0, 8)}</td>
                      <td className="px-4 py-4 text-xs">
                        <div className="font-black whitespace-nowrap">#{o.service_id}</div>
                        <div className="text-muted-foreground">qty: <span className="font-mono text-primary">{o.quantity || '—'}</span></div>
                      </td>
                      <td className="px-4 py-4 font-black text-destructive text-sm whitespace-nowrap">{o.cost ? `$${Number(o.cost).toFixed(3)}` : '—'}</td>
                      <td className="px-4 py-4 text-right">
                        <span
                          className="inline-flex px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider border whitespace-nowrap"
                          style={{
                            backgroundColor: (STATUS_COLORS[o.status] || '#888') + '18',
                            color:            STATUS_COLORS[o.status] || '#888',
                            borderColor:      (STATUS_COLORS[o.status] || '#888') + '40',
                          }}
                        >
                          {o.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr><td colSpan={6} className="py-20 text-center text-muted-foreground font-bold">No orders found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── USERS ──────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg animate-in slide-in-from-left-4 duration-500">
          <div className="p-6 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
            <h2 className="font-bold text-xl flex items-center gap-3"><UsersIcon className="w-6 h-6 text-primary" /> User Accounts ({users.length})</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 w-full md:w-72 shadow-sm"
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="text-[10px] uppercase bg-muted/40 text-muted-foreground font-black tracking-widest">
                <tr>
                  <th className="px-4 py-5">User</th>
                  <th className="px-4 py-5">Role</th>
                  <th className="px-4 py-5">Referral Code</th>
                  <th className="px-4 py-5">Balance</th>
                  <th className="px-4 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredUsers.map((u: any) => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-5">
                      <p className="font-bold">{u.email || 'No email'}</p>
                      <p className="font-mono text-[10px] text-muted-foreground opacity-50 mt-1">ID: {u.id}</p>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider ${
                        u.role === 'admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      }`}>{u.role || 'user'}</span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="font-mono text-[11px] text-amber-400 font-black">{u.referral_code || '—'}</span>
                    </td>
                    <td className="px-4 py-5 whitespace-nowrap">
                      <span className="font-black text-emerald-500 text-lg">${Number(u.balance || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-5 text-right">
                      <button
                        onClick={() => updateBalance(u.id, Number(u.balance || 0))}
                        className="px-4 py-2 bg-background border border-border hover:border-primary hover:text-primary rounded-xl transition-all flex items-center gap-2 ml-auto text-xs font-bold shadow-sm whitespace-nowrap"
                      >
                        <Edit className="w-3.5 h-3.5" /> Adjust
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-muted-foreground font-bold">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DEPOSITS ───────────────────────────────────────────────────────── */}
      {activeTab === 'deposits' && (
        <div className="space-y-4 animate-in slide-in-from-left-4 duration-500">
          {/* Auto-approve notice */}
          {autoThreshold > 0 && (
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-3">
              <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-[11px] font-black text-emerald-400">
                Auto-approve active — deposits ≤ ${autoThreshold} are approved instantly.
              </p>
            </div>
          )}

          <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg">
            <div className="p-6 border-b border-border/50 bg-muted/20">
              <h2 className="font-bold text-xl flex items-center gap-3"><Clock className="w-6 h-6 text-primary" /> Deposits Ledger</h2>
              <p className="text-muted-foreground text-sm mt-1">Approve or reject deposit requests</p>
            </div>
            <div className="table-responsive">
              <table className="w-full text-sm text-left min-w-[900px]">
                <thead className="text-[10px] uppercase bg-muted/40 text-muted-foreground font-black tracking-widest">
                  <tr>
                    <th className="px-4 py-5">User</th>
                    <th className="px-4 py-5">Amount</th>
                    <th className="px-4 py-5">Proof</th>
                    <th className="px-4 py-5">Status</th>
                    <th className="px-4 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {deposits.map((dep: any) => (
                    <tr key={dep.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-5">
                        <span className="font-bold block mb-1">{users.find(u => u.id === dep.user_id)?.email || 'N/A'}</span>
                        <span className="font-mono text-[10px] text-muted-foreground opacity-50">{dep.user_id?.substring(0, 8)}</span>
                      </td>
                      <td className="px-4 py-5 font-black text-emerald-500 text-lg whitespace-nowrap">+${Number(dep.amount).toFixed(2)}</td>
                      <td className="px-4 py-5 text-xs">
                        <div className="font-black uppercase tracking-wider mb-1 whitespace-nowrap">{dep.method}</div>
                        <a href={dep.proof} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-400 font-bold underline text-[11px] truncate block max-w-[120px]">
                          View Proof
                        </a>
                      </td>
                      <td className="px-4 py-5 whitespace-nowrap">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider border ${
                          dep.status === 'pending'  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          dep.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>{dep.status}</span>
                      </td>
                      <td className="px-4 py-5 text-right">
                        {dep.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button onClick={() => handleDeposit(dep.id, 'approve')} className="px-3 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 whitespace-nowrap">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button onClick={() => handleDeposit(dep.id, 'reject')} className="px-3 py-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition-all font-bold text-xs flex items-center gap-1.5 whitespace-nowrap">
                              <XCircle className="w-3.5 h-3.5" /> Deny
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-50">Executed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {deposits.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-muted-foreground font-bold">No deposit requests.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SETTINGS ───────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">

          {/* ── AUTO-APPROVE ── */}
          <div className="bg-card border border-border rounded-[2rem] p-8">
            <h2 className="font-black text-xl flex items-center gap-3 mb-2">
              <Zap className="w-6 h-6 text-emerald-500" /> Auto-Approve Deposits
            </h2>
            <p className="text-muted-foreground text-sm mb-6">Any deposit ≤ threshold is approved instantly with no manual review.</p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-muted-foreground">$</span>
                <input
                  type="number"
                  value={autoThreshold}
                  min={0}
                  step={5}
                  onChange={e => setAutoThreshold(Number(e.target.value))}
                  className="px-4 py-3 border border-border rounded-xl bg-background w-32 font-mono text-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                onClick={async () => {
                  setSavingThreshold(true);
                  await saveSetting('auto_approve_threshold', autoThreshold);
                  setSavingThreshold(false);
                }}
                disabled={savingThreshold}
                className="px-6 py-3 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {savingThreshold ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Save Threshold
              </button>
            </div>

            <div className="mt-4 flex items-start gap-2 text-[11px] font-black text-amber-400/70 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Set to $0 to disable. Only raise this for trusted payment methods with verified proofs.
            </div>
          </div>

          {/* ── JAP SYNC ── */}
          <div className="bg-card border border-border rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-black text-lg mb-3">JAP — Profit Margin (%)</h3>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">+</span>
                <input type="number" value={japMarkup} onChange={e => setJapMarkup(Number(e.target.value))} className="px-4 py-3 border border-border rounded-xl bg-background w-32 font-mono text-lg focus:ring-2 focus:ring-primary" />
                <span className="text-xl font-bold">%</span>
                <button onClick={() => saveSetting('jap_markup', japMarkup)} className="ms-4 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all">Save</button>
              </div>
            </div>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const markup = 1 + (japMarkup / 100);
                  const { data: userData } = await supabase.auth.getUser();
                  if (!userData?.user) throw new Error('Not authenticated.');
                  const { data, error } = await supabase.functions.invoke('supplier-proxy', { body: { action: 'services' } });
                  if (error) throw error;
                  if (!Array.isArray(data)) throw new Error('Invalid API response.');
                  // @ts-ignore
                  const batch = data.map(s => ({ service_id: String(s.service), name: s.name, category: s.category, rate: Number(s.rate) * markup, min: Number(s.min), max: Number(s.max) }));
                  for (let i = 0; i < batch.length; i += 500) {
                    // @ts-ignore
                    const { error: e } = await supabase.from('smm_services').upsert(batch.slice(i, i + 500), { onConflict: 'service_id' });
                    if (e) throw e;
                  }
                  alert(`Synced ${batch.length} JAP services!`);
                } catch (err: any) { alert(err.message); }
                setLoading(false);
              }}
              disabled={loading}
              className="px-8 py-4 bg-primary text-primary-foreground font-black rounded-2xl hover:opacity-90 hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
            >
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} /> Sync JAP
            </button>
          </div>

          {/* ── SAHL CASH SYNC ── */}
          <div className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-emerald-500/20 rounded-[2rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-black text-lg mb-3">🎮 Sahl Cash — Markup (%)</h3>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold">+</span>
                <input type="number" value={sahlMarkup} onChange={e => setSahlMarkup(Number(e.target.value))} className="px-4 py-3 border border-border rounded-xl bg-background w-32 font-mono text-lg focus:ring-2 focus:ring-emerald-500" />
                <span className="text-xl font-bold">%</span>
                <button onClick={() => saveSetting('sahl_markup', sahlMarkup)} className="ms-4 px-4 py-2 bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all">Save</button>
              </div>
            </div>
            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const markup = 1 + (sahlMarkup / 100);
                  const { data: userData } = await supabase.auth.getUser();
                  if (!userData?.user) throw new Error('Not authenticated.');
                  const { data, error } = await supabase.functions.invoke('sahl-cash-proxy', { body: { action: 'products' } });
                  if (error) throw error;
                  if (!Array.isArray(data)) throw new Error('Invalid response from sahl-cash-proxy.');
                  // @ts-ignore
                  const batch = data.filter((p: any) => p.available).map((p: any) => ({ service_id: `sahl_${p.id}`, name: p.name, category: `🎮 ${p.category_name || 'Game Recharge'}`, rate: Number(p.price) * markup, min: p.qty_values?.min ? Number(p.qty_values.min) : 1, max: p.qty_values?.max ? Number(p.qty_values.max) : 1 }));
                  for (let i = 0; i < batch.length; i += 500) {
                    // @ts-ignore
                    const { error: e } = await supabase.from('smm_services').upsert(batch.slice(i, i + 500), { onConflict: 'service_id' });
                    if (e) throw e;
                  }
                  alert(`Synced ${batch.length} Sahl Cash products!`);
                } catch (err: any) { alert(err.message); }
                setLoading(false);
              }}
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-black rounded-2xl hover:opacity-90 hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-emerald-500/20"
            >
              <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} /> Sync Sahl Cash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
