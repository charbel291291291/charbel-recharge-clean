import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useLanguage } from '@/i18n/LanguageContext';
import { LayoutDashboard, ShoppingBag, LogOut, Shield, Globe, Home, Rocket, Gamepad2 } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationBell from '@/components/NotificationBell';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { data: isAdmin } = useAdminAccess();
  const location = useLocation();
  const { t, lang, setLang } = useLanguage();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();

  const navItems = [
    { to: '/home', label: 'Hub Center', icon: Home },
    { to: '/cedar-boost', label: 'CedarBoost', icon: Gamepad2 },
    { to: '/smm-engine', label: 'SMM Engine', icon: Rocket },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border glass sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <Link
            to="/dashboard"
            className="group flex items-center gap-2 min-w-0 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]"
          >
            <BrandLogo size="sm" className="shrink-0 transition-transform duration-300 group-hover:-translate-y-px" />
            <span className="brand-header-title text-base sm:text-lg truncate hidden sm:inline">
              CedarBoost
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  location.pathname === to
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
            {isAdmin ? (
              <Link
                to="/admin"
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  location.pathname === '/admin'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">{t('admin')}</span>
              </Link>
            ) : null}
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={markAllRead}
              onClear={clearAll}
            />
            <button
              onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              title={lang === 'en' ? 'العربية' : 'English'}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-medium">{lang === 'en' ? 'AR' : 'EN'}</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive transition-colors ms-2"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container py-6">
        {children}
      </main>
    </div>
  );
}
