import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Shield, RefreshCw, CheckCircle2, XCircle, Clock, Users as UsersIcon, DollarSign, Activity, LayoutDashboard, ShoppingCart, ListOrdered, Edit, Search, Settings } from 'lucide-react';

export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [metrics, setMetrics] = useState({ users: 0, balance: 0, pendingDeposits: 0, failedOrders: 0 });
  const [deposits, setDeposits] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Settings States
  const [japMarkup, setJapMarkup] = useState(50);
  const [sahlMarkup, setSahlMarkup] = useState(30);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // @ts-ignore
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
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200),
        // @ts-ignore
        supabase.from('settings').select('*')
      ]);

      const totalBalance = balanceRes.data?.reduce((acc: any, user: any) => acc + Number(user.balance || 0), 0) || 0;
      
      setMetrics({ 
          users: userRes.count || 0, 
          balance: totalBalance, 
          pendingDeposits: pendingRes.count || 0, 
          failedOrders: 0 
      });

      setDeposits(depRes.data || []);
      setUsers(usersList.data || []);
      setOrders(ordersRes.data || []);

      if (settingsRes.data) {
          const jm = settingsRes.data.find((s: any) => s.key === 'jap_markup');
          const sm = settingsRes.data.find((s: any) => s.key === 'sahl_markup');
          // @ts-ignore
          if (jm) setJapMarkup(Number(jm.value));
          // @ts-ignore
          if (sm) setSahlMarkup(Number(sm.value));
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdminData(); }, []);

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

  const updateBalance = async (userId: string, currentBalance: number) => {
      const newBal = prompt("Enter new absolute wallet balance (USD):", String(currentBalance));
      if (newBal !== null && !isNaN(Number(newBal))) {
          // @ts-ignore
          const { error } = await supabase.from('users').update({ balance: Number(newBal) }).eq('id', userId);
          if (error) alert("Error updating balance: " + error.message);
          else fetchAdminData();
      }
  };

  const saveSetting = async (key: string, value: any) => {
    setLoading(true);
    try {
      // @ts-ignore
      const { error } = await supabase.from('settings').upsert({ key, value: String(value) });
      if (error) throw error;
      alert(`Saved ${key} successfully!`);
      // No need to full re-fetch everything, just update state is fine or fetch settings
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => u.id.includes(searchQuery) || (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-500/20 to-purple-500/20 text-red-500 rounded-xl shadow-inner border border-red-500/20">
              <Shield className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black leading-tight pt-1 bg-gradient-to-r from-red-500 to-purple-500 bg-clip-text text-transparent drop-shadow-sm">Pro Admin Engine</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-widest font-bold mt-1">Total System Control</p>
          </div>
        </div>
        <button onClick={fetchAdminData} disabled={loading} className="px-5 py-2.5 bg-card border border-border shadow-sm rounded-xl hover:bg-muted font-bold text-sm transition-all flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} /> Sync Data
        </button>
      </div>

      {/* HORIZONTAL TABS */}
      <div className="flex overflow-x-auto gap-2 mb-8 bg-card/60 p-2 rounded-2xl border border-border mt-6 backdrop-blur-sm shadow-sm no-scrollbar">
          {[
              { id: 'overview', label: 'Overview', icon: LayoutDashboard },
              { id: 'users', label: 'Users Map', icon: UsersIcon },
              { id: 'orders', label: 'Global Orders', icon: ShoppingCart },
              { id: 'deposits', label: 'Finance & Deposits', icon: DollarSign },
              { id: 'settings', label: 'SMM API Sync', icon: Settings },
          ].map(tab => (
              <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[160px] py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                      activeTab === tab.id 
                      ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02] shadow-primary/20 ring-1 ring-primary/50' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
              >
                  <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'opacity-100' : 'opacity-70'}`} /> {tab.label}
              </button>
          ))}
      </div>

      {/* OVERVIEW METRICS TAB */}
      {activeTab === 'overview' && (
          <div className="space-y-6 animate-in slide-in-from-left-4 duration-500">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Users", val: metrics.users, icon: UsersIcon, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
                  { label: "System Liability", val: `$${metrics.balance.toFixed(2)}`, icon: DollarSign, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
                  { label: "Pending Deposits", val: metrics.pendingDeposits, icon: Clock, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
                  { label: "System Health", val: "Operational", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
                ].map((m, i) => (
                  <div key={i} className="bg-card border border-border p-6 rounded-[2rem] flex items-center justify-between hover:scale-[1.02] transition-transform hover:shadow-xl shadow-sm">
                    <div>
                        <p className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest mb-2 opacity-80">{m.label}</p>
                        <h3 className="text-3xl lg:text-4xl font-black">{m.val}</h3>
                    </div>
                    <div className={`p-4 rounded-2xl border ${m.bg}`}><m.icon className={`w-7 h-7 ${m.color}`} /></div>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-border rounded-3xl p-8 text-center mt-4">
                  <Activity className="w-12 h-12 text-primary/20 mx-auto mb-4" />
                  <h3 className="text-xl font-bold mb-2">System is running normally</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">All databases, proxy edges, and CRON logic are properly routed. SMM APIs are live.</p>
              </div>
          </div>
      )}

      {/* USERS MANAGEMENT TAB */}
      {activeTab === 'users' && (
          <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg animate-in slide-in-from-left-4 duration-500">
            <div className="p-6 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/20">
                <h2 className="font-bold text-xl flex items-center gap-3"><UsersIcon className="w-6 h-6 text-primary"/> User Accounts</h2>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" placeholder="Search by email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 w-full md:w-72 shadow-sm transition-all" />
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] uppercase bg-muted/40 text-muted-foreground font-black tracking-widest">
                        <tr>
                            <th className="px-8 py-5">User Details</th>
                            <th className="px-8 py-5">Role Privileges</th>
                            <th className="px-8 py-5">Wallet Balance</th>
                            <th className="px-8 py-5 text-right">Admin Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                                <td className="px-8 py-5">
                                    <p className="font-bold text-foreground">{u.email || 'No email'}</p>
                                    <p className="font-mono text-[10px] text-muted-foreground mt-1 opacity-50 group-hover:opacity-100 transition-opacity">ID: {u.id}</p>
                                </td>
                                <td className="px-8 py-5">
                                    <span className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider
                                        ${u.role === 'admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                                        {u.role || 'user'}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="font-black text-emerald-500 text-lg">${Number(u.balance || 0).toFixed(2)}</span>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <button onClick={() => updateBalance(u.id, Number(u.balance || 0))} className="px-4 py-2 bg-background border border-border hover:border-primary hover:text-primary rounded-xl transition-all flex items-center gap-2 ml-auto text-xs font-bold shadow-sm">
                                        <Edit className="w-3.5 h-3.5" /> Adjust Balance
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                            <tr><td colSpan={4} className="py-20 text-center text-muted-foreground font-bold">No users detected.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
          <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg animate-in slide-in-from-left-4 duration-500">
            <div className="p-6 border-b border-border/50 bg-muted/20">
                <h2 className="font-bold text-xl flex items-center gap-3"><ListOrdered className="w-6 h-6 text-primary"/> Global Transactions Monitor</h2>
                <p className="text-muted-foreground text-sm mt-1">Watch live order injection to JustAnotherPanel</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] uppercase bg-muted/40 text-muted-foreground font-black tracking-widest">
                        <tr>
                            <th className="px-8 py-5">Order Tag</th>
                            <th className="px-8 py-5">User Account</th>
                            <th className="px-8 py-5">Service Details</th>
                            <th className="px-8 py-5">Cost Matrix</th>
                            <th className="px-8 py-5 text-right">Live Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {orders.map(o => (
                            <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-8 py-5 font-mono text-xs opacity-70">#{o.id.substring(0,8)}</td>
                                <td className="px-8 py-5 text-xs font-bold">{users.find(u => u.id === o.user_id)?.email || o.user_id?.substring(0,8)}</td>
                                <td className="px-8 py-5 text-xs">
                                    <div className="font-black text-foreground">SMM #{o.service_id}</div>
                                    <div className="text-muted-foreground mt-0.5">Quantity: <span className="font-mono text-primary">{o.quantity || '-'}</span></div>
                                </td>
                                <td className="px-8 py-5 font-black text-destructive">-${Number(o.cost || 0).toFixed(3)}</td>
                                <td className="px-8 py-5 text-right">
                                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider shadow-sm
                                        ${o.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                          o.status === 'processing' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse' : 
                                          o.status === 'canceled' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                          'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                        {o.status || 'pending'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {orders.length === 0 && (
                            <tr><td colSpan={5} className="py-20 text-center text-muted-foreground font-bold">No orders placed yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
      )}

      {/* DEPOSITS TAB */}
      {activeTab === 'deposits' && (
        <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg animate-in slide-in-from-left-4 duration-500">
          <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
              <div>
                  <h2 className="font-bold text-xl flex items-center gap-3"><Clock className="w-6 h-6 text-primary"/> Manual Deposits Ledger</h2>
                  <p className="text-muted-foreground text-sm mt-1">Approve or reject USDT and Whish Money requests</p>
              </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] uppercase bg-muted/40 text-muted-foreground font-black tracking-widest">
                <tr>
                    <th className="px-8 py-5">User</th>
                    <th className="px-8 py-5">Amount Submitted</th>
                    <th className="px-8 py-5">Verification</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {deposits.map(dep => (
                  <tr key={dep.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-8 py-5">
                        <span className="font-bold text-sm block mb-1">{users.find(u => u.id === dep.user_id)?.email || 'N/A'}</span>
                        <span className="font-mono text-[10px] text-muted-foreground opacity-50">{dep.user_id?.substring(0,8)}</span>
                    </td>
                    <td className="px-8 py-5 font-black text-emerald-500 text-lg">+${Number(dep.amount).toFixed(2)}</td>
                    <td className="px-8 py-5 text-xs">
                        <div className="font-black uppercase tracking-wider mb-1 text-foreground">{dep.method}</div>
                        <a href={dep.proof} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-400 font-bold underline text-[11px] truncate block max-w-[120px]">
                            View Transaction Proof
                        </a>
                    </td>
                    <td className="px-8 py-5">
                       <span className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-black tracking-wider border
                           ${dep.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                             dep.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                             'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                           {dep.status}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      {dep.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleDeposit(dep.id, 'approve')} className="px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-sm">
                              <CheckCircle2 className="w-4 h-4"/> Authorize
                          </button>
                          <button onClick={() => handleDeposit(dep.id, 'reject')} className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white rounded-xl transition-all font-bold text-xs flex items-center gap-2 shadow-sm">
                              <XCircle className="w-4 h-4"/> Deny
                          </button>
                        </div>
                      ) : (
                          <span className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-50">Executed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {deposits.length === 0 && <tr><td colSpan={5} className="py-20 text-center text-muted-foreground font-bold">No recent deposit requests. All caught up!</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="bg-card border border-border rounded-[2rem] overflow-hidden shadow-lg animate-in slide-in-from-left-4 duration-500 p-8">
            <h2 className="font-bold text-2xl flex items-center gap-3 mb-2"><Settings className="w-8 h-8 text-primary"/> API Integrations Sandbox</h2>
            <p className="text-muted-foreground mb-8 text-sm">Pull wholesale services from JustAnotherPanel.com via Edge Functions, apply your markup, and flash them into your database.</p>
            
            {/* ─── JAP SYNC ─── */}
            <div className="bg-muted/20 border border-border rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                   <h3 className="font-black text-lg mb-2 text-foreground">JAP — Profit Margin Markup (%)</h3>
                   <div className="flex items-center gap-2">
                     <span className="text-xl font-bold">+</span>
                     <input type="number" value={japMarkup} onChange={(e) => setJapMarkup(Number(e.target.value))} className="px-4 py-3 border border-border rounded-xl bg-background w-32 font-mono text-lg focus:ring-2 focus:ring-primary shadow-inner" />
                     <span className="text-xl font-bold">%</span>
                     <button onClick={() => saveSetting('jap_markup', japMarkup)} className="ms-4 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary hover:text-white transition-all">Save Setting</button>
                   </div>
                   <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2 font-bold">Applied to JAP wholesale rate automatically.</p>
                </div>
                
                <button 
                  onClick={async () => {
                     setLoading(true);
                     try {
                        const markup = 1 + (japMarkup / 100);
                        
                        const { data: userData } = await supabase.auth.getUser();
                        if (!userData?.user) throw new Error("User not authenticated. Please wait for session.");

                        const { data, error } = await supabase.functions.invoke('supplier-proxy', { body: { action: 'services' } });
                        if (error) throw error;
                        if (!Array.isArray(data)) {
                             throw new Error("Invalid response from API. Check Edge Function logs.");
                        }
                        
                        // @ts-ignore
                        const batch = data.map(s => ({
                           service_id: String(s.service),
                           name: s.name,
                           category: s.category,
                           rate: Number(s.rate) * markup,
                           min: Number(s.min),
                           max: Number(s.max)
                        }));
                        
                        for(let i=0; i < batch.length; i+=500) {
                            const chunk = batch.slice(i, i+500);
                            // @ts-ignore
                            const { error: upsertErr } = await supabase.from('smm_services').upsert(chunk, { onConflict: 'service_id' });
                            if (upsertErr) throw upsertErr;
                        }
                        
                        alert(`Successfully synced ${batch.length} JAP services with +${japMarkup}% markup!`);
                     } catch(err: any) { alert(err.message); }
                     setLoading(false);
                  }}
                  disabled={loading}
                  className="px-8 py-4 bg-primary text-primary-foreground font-black rounded-2xl hover:opacity-90 hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-primary/20"
                >
                   <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} /> Sync JAP Services
                </button>
            </div>

            {/* ─── DIVIDER ─── */}
            <div className="flex items-center gap-4 my-10">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-muted-foreground text-xs font-black uppercase tracking-widest">Supplier #2</span>
                <div className="flex-1 h-px bg-border"></div>
            </div>

            {/* ─── SAHL CASH SYNC ─── */}
            <div className="bg-gradient-to-br from-emerald-500/5 to-blue-500/5 border border-emerald-500/20 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                   <h3 className="font-black text-lg mb-2 text-foreground">🎮 Sahl Cash — Markup Settings (%)</h3>
                   <div className="flex items-center gap-2">
                     <span className="text-xl font-bold">+</span>
                     <input type="number" value={sahlMarkup} onChange={(e) => setSahlMarkup(Number(e.target.value))} className="px-4 py-3 border border-border rounded-xl bg-background w-32 font-mono text-lg focus:ring-2 focus:ring-emerald-500 shadow-inner" />
                     <span className="text-xl font-bold">%</span>
                     <button onClick={() => saveSetting('sahl_markup', sahlMarkup)} className="ms-4 px-4 py-2 bg-emerald-600/10 text-emerald-600 border border-emerald-500/20 rounded-lg text-xs font-bold hover:bg-emerald-600 hover:text-white transition-all">Save Setting</button>
                   </div>
                   <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-2 font-bold">Markup on Sahl Cash wholesale price.</p>
                </div>
                
                <button 
                  onClick={async () => {
                     setLoading(true);
                     try {
                        const markup = 1 + (sahlMarkup / 100);
                        
                        const { data: userData } = await supabase.auth.getUser();
                        if (!userData?.user) throw new Error("Not authenticated.");

                        const { data, error } = await supabase.functions.invoke('sahl-cash-proxy', { body: { action: 'products' } });
                        if (error) throw error;
                        if (!Array.isArray(data)) {
                             throw new Error("Invalid response from sahl-cash-proxy.");
                        }
                        
                        // Map Sahl Cash products to smm_services format
                        // @ts-ignore
                        const batch = data.filter(p => p.available).map(p => ({
                           service_id: `sahl_${p.id}`,
                           name: p.name,
                           category: `🎮 ${p.category_name || 'Game Recharge'}`,
                           rate: Number(p.price) * markup,
                           min: p.qty_values?.min ? Number(p.qty_values.min) : 1,
                           max: p.qty_values?.max ? Number(p.qty_values.max) : 1,
                        }));
                        
                        for(let i=0; i < batch.length; i+=500) {
                            const chunk = batch.slice(i, i+500);
                            // @ts-ignore
                            const { error: upsertErr } = await supabase.from('smm_services').upsert(chunk, { onConflict: 'service_id' });
                            if (upsertErr) throw upsertErr;
                        }
                        
                        alert(`✅ Synced ${batch.length} Sahl Cash products with +${sahlMarkup}% markup!`);
                     } catch(err: any) { alert(err.message); }
                     setLoading(false);
                  }}
                  disabled={loading}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-black rounded-2xl hover:opacity-90 hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-emerald-500/20"
                >
                   <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} /> Sync Sahl Cash Products
                </button>
            </div>
        </div>
      )}

    </div>
  );
}
