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

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { data: isAdmin } = useAdminAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  
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
        <div className="container h-full flex items-center justify-between px-4 sm:px-8">
          
          <div className="flex items-center gap-4 sm:gap-8">
             {/* LOGO & 3D NAME */}
            <div
              onClick={handleLogoClick}
              className="group flex items-center gap-3 shrink-0 cursor-pointer active:scale-95 transition-transform"
            >
              <BrandLogo size="sm" className="w-8 h-8 sm:w-10 sm:h-10 transition-transform group-hover:rotate-12" />
              <div className="flex flex-col">
                 <span className="brand-header-title text-base sm:text-xl leading-none">CEDAR BOOST</span>
                 <span className="text-[7px] sm:text-[9px] font-black text-white/40 uppercase tracking-[0.4em] mt-1 italic">PREMIUM HUB</span>
              </div>
            </div>

            {/* DESKTOP NAV */}
            <nav className="hidden md:flex items-center gap-1">
               <NavLinks />
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
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
               className="p-3 sm:p-4 rounded-2xl bg-white/5 border border-white/10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive active:scale-90 transition-all ms-2"
            >
               <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* MOBILE MENU */}
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-3 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20 active:scale-90 transition-all">
                    <Menu className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="glass border-white/10 w-[280px] p-6 flex flex-col gap-8">
                   <div className="flex items-center gap-3 mb-4">
                      <BrandLogo size="sm" />
                      <span className="brand-header-title text-xl">CEDAR BOOST</span>
                   </div>
                   <div className="flex flex-col gap-2">
                       <NavLinks mobile />
                   </div>
                   <div className="mt-auto pt-6 border-t border-white/5">
                       <LanguageSelector />
                   </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden pt-4 pb-12">
        <div className="container px-4 sm:px-8">
           {children}
        </div>
      </main>
      
      {/* PWA STATUS INDICATOR */}
      <div className="fixed bottom-4 right-4 z-40 hidden sm:block opacity-20 hover:opacity-100 transition-opacity">
         <div className="glass rounded-full px-4 py-1.5 border-emerald-500/20 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/80 italic">PWA CORE ACTIVE</span>
         </div>
      </div>
    </div>
  );
}
