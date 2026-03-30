import { ReactNode, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useLanguage } from '@/i18n/LanguageContext';
import { LogOut, Home, Rocket, Gamepad2, ShieldIcon, Menu, ShoppingBag, Wallet } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationBell from '@/components/NotificationBell';
import AdminPinVault from './AdminPinVault';
import LanguageSelector from './LanguageSelector';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { data: isAdmin } = useAdminAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  
  // Monitor network status globally
  useNetworkStatus();
  
  const [clickCount, setClickCount] = useState(0);
  const [showVault, setShowVault] = useState(false);
  const lastClickRef = useRef<number>(0);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickRef.current > 2000) {
      setClickCount(1);
    } else {
      const newCount = clickCount + 1;
      if (newCount === 5) {
        setShowVault(true);
        setClickCount(0);
      } else {
        setClickCount(newCount);
      }
    }
    lastClickRef.current = now;
  };

  const navItems = [
    { to: '/home', label: t('hubCenter'), icon: Home },
    { to: '/cedar-boost', label: t('cedarCard'), icon: Gamepad2 },
    { to: '/smm-engine', label: t('smmEngine'), icon: Rocket },
    { to: '/orders', label: 'Orders', icon: ShoppingBag },
    { to: '/dashboard', label: 'Wallet', icon: Wallet },
  ];

  const NavLinks = ({ mobile }: { mobile?: boolean }) => (
    <>
      {navItems.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
            location.pathname === to
              ? 'bg-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/10'
              : 'text-muted-foreground hover:bg-white/5 hover:text-white'
          } ${mobile ? 'w-full justify-start' : ''}`}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span>{label}</span>
        </Link>
      ))}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#050505] selection:bg-primary/30">
      {showVault && (
        <AdminPinVault 
          onSuccess={() => {
            setShowVault(false);
            if (isAdmin) navigate('/admin');
            else toast.error("Admin credentials verified, but DB role missing.");
          }}
          onCancel={() => setShowVault(false)} 
        />
      )}

      {/* HEADER */}
      <header className="border-b border-white/5 glass sticky top-0 z-50 h-16 sm:h-20">
        <div className="container h-full flex items-center justify-between px-3 sm:px-6 md:px-8">
          
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
             {/* LOGO & 3D NAME */}
            <div
              onClick={handleLogoClick}
              className="group flex items-center gap-2 sm:gap-3 shrink-0 cursor-pointer active:scale-95 transition-transform"
            >
              <BrandLogo size="sm" className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 transition-transform group-hover:rotate-12" />
              <div className="flex flex-col min-w-0">
                 <span className="brand-header-title text-sm sm:text-lg md:text-xl leading-none truncate">CEDAR BOOST</span>
                 <span className="text-[6px] sm:text-[8px] md:text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mt-0.5 italic whitespace-nowrap">PREMIUM HUB</span>
              </div>
            </div>

            {/* DESKTOP NAV */}
            <nav className="hidden lg:flex items-center gap-1">
               <NavLinks />
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={markAllRead}
              onClear={clearAll}
            />
            
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>

            <button
               onClick={signOut}
               className="p-2.5 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all ms-1 sm:ms-2"
            >
               <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
            </button>

            {/* MOBILE SETTINGS SHEET — language + sign out */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 active:scale-95 transition-all">
                    <Menu className="w-4 h-4" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="glass border-white/10 w-[260px] p-5 flex flex-col gap-5 overflow-y-auto">
                   <div className="flex items-center gap-3 pb-4 border-b border-white/5">
                      <BrandLogo size="sm" className="w-9 h-9" />
                      <div>
                        <span className="brand-header-title text-base block">CEDAR BOOST</span>
                        <span className="text-[7px] font-black text-white/40 uppercase tracking-[0.4em] italic">PREMIUM HUB</span>
                      </div>
                   </div>
                   <div className="flex flex-col gap-2 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/25 mb-1">Language</p>
                      <LanguageSelector />
                   </div>
                   <button
                     onClick={signOut}
                     className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive font-black text-xs uppercase tracking-widest transition-all hover:bg-destructive/20 active:scale-95"
                   >
                     <LogOut className="w-4 h-4" /> Sign Out
                   </button>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden pt-4 pb-28 lg:pb-20 sm:pt-6">
        <div className="container px-3 sm:px-6 md:px-8 max-w-7xl mx-auto">
           {children}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV — thumb zone, hidden on desktop */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#050505]/95 backdrop-blur-2xl border-t border-white/[0.06]">
        <div className="flex items-stretch justify-around px-1 pt-1 pb-2">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 min-w-0 transition-all active:scale-95 ${
                  active ? 'text-primary' : 'text-white/30'
                }`}
              >
                <div className={`relative p-1.5 rounded-xl transition-all ${active ? 'bg-primary/15' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[8px] font-black uppercase tracking-wide truncate max-w-[52px] px-0.5 ${active ? 'text-primary' : 'text-white/25'}`}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* PWA STATUS INDICATOR — Desktop only */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 hidden lg:block opacity-20 hover:opacity-100 transition-opacity">
         <div className="glass rounded-full px-3 py-1.5 border-emerald-500/20 flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-emerald-500/80 italic">PWA CORE ACTIVE</span>
         </div>
      </div>
    </div>
  );
}
