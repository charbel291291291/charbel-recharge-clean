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

            {/* MOBILE MENU */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 active:scale-95 transition-all">
                    <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="glass border-white/10 w-[300px] sm:w-[350px] p-4 sm:p-6 flex flex-col gap-6 overflow-y-auto">
                   <div className="flex items-center gap-3 mb-2 pb-4 border-b border-white/5">
                      <BrandLogo size="md" className="w-10 h-10 sm:w-12 sm:h-12" />
                      <div>
                        <span className="brand-header-title text-lg sm:text-xl block">CEDAR BOOST</span>
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.4em] italic">PREMIUM HUB</span>
                      </div>
                   </div>
                   <div className="flex flex-col gap-2 flex-1">
                       <NavLinks mobile />
                   </div>
                   <div className="pt-4 border-t border-white/5">
                       <LanguageSelector />
                   </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden pt-4 pb-12 sm:pt-6 sm:pb-16 md:pb-20">
        <div className="container px-3 sm:px-6 md:px-8 max-w-7xl mx-auto">
           {children}
        </div>
      </main>
      
      {/* PWA STATUS INDICATOR - Hidden on mobile */}
      <div className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-40 hidden sm:block opacity-20 hover:opacity-100 transition-opacity">
         <div className="glass rounded-full px-3 py-1.5 border-emerald-500/20 flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-emerald-500/80 italic">PWA CORE ACTIVE</span>
         </div>
      </div>
    </div>
  );
}
