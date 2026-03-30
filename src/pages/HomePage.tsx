import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Wallet, Gamepad2, Rocket, Lock, Headphones } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import SocialProof from '@/components/SocialProof';
import TrustLayer from '@/components/TrustLayer';

export default function HomePage() {
  const { t } = useLanguage();
  
  const portalCards = [
    {
      title: t('hubCenter'),
      description: t('hubCenterDesc'),
      icon: Wallet,
      image: "/assets/hub_wallet.png",
      link: "/dashboard",
      color: "from-blue-500/20 to-cyan-500/20",
      accent: "text-blue-400",
      border: "hover:border-blue-500/40"
    },
    {
      title: t('cedarCard'),
      description: t('cedarCardDesc'),
      icon: Gamepad2,
      image: "/assets/hub_gaming.png",
      link: "/cedar-boost",
      color: "from-emerald-500/20 to-teal-500/20",
      accent: "text-emerald-400",
      border: "hover:border-emerald-500/40"
    },
    {
      title: t('smmEngine'),
      description: t('smmEngineDesc'),
      icon: Rocket,
      image: "/assets/hub_smm.png",
      link: "/smm-engine",
      color: "from-purple-500/20 to-pink-500/20",
      accent: "text-purple-400",
      border: "hover:border-purple-500/40"
    }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 pt-10 pb-20 max-w-7xl mx-auto px-4">
      <SocialProof />
      
      {/* HERO SECTION */}
      <div className="text-center max-w-4xl mx-auto mb-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] -z-10" />
        <div className="flex items-center justify-center gap-3 mb-6 animate-bounce">
           <Zap className="w-5 h-5 text-primary fill-primary" />
           <span className="text-xs font-black uppercase tracking-[0.5em] text-muted-foreground opacity-70">{t('unifiedHub')}</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-none bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent italic">
          {t('choosePath')}
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-bold max-w-2xl mx-auto leading-relaxed opacity-80">
          {t('welcomeNextGen')} <br/>
          <span className="text-foreground opacity-100">{t('securedBy')}</span>
        </p>
      </div>

      {/* THREE ENTRY POINTS */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {portalCards.map((card, i) => (
           <Link 
             key={i}
             to={card.link} 
             className={`group relative bg-card border border-white/5 rounded-[3rem] overflow-hidden transition-all duration-700 hover:shadow-[0_0_80px_rgba(0,0,0,0.5)] hover:-translate-y-4 ${card.border}`}
           >
             {/* IMAGE HEADER */}
             <div className="relative h-64 overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-t ${card.color} mix-blend-overlay z-10`} />
                <img 
                   src={card.image} 
                   alt={card.title} 
                   className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000 ease-out grayscale-[0.2] group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent z-20" />
                
                <div className="absolute bottom-8 left-8 z-30">
                   <div className={`p-4 rounded-2xl bg-black/40 backdrop-blur-3xl border border-white/10 shadow-2xl group-hover:scale-110 transition-transform`}>
                      <card.icon className={`w-8 h-8 ${card.accent}`} />
                   </div>
                </div>
             </div>

             {/* CARD CONTENT */}
             <div className="p-10 relative z-30 pt-4">
                <h2 className={`text-3xl font-black mb-4 group-hover:translate-x-2 transition-transform duration-500 flex items-center gap-3`}>
                  {card.title} 
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-8 opacity-70 group-hover:opacity-100 transition-opacity">
                  {card.description}
                </p>
                <div className="flex items-center gap-3 font-black text-[10px] uppercase tracking-widest text-foreground bg-white/5 w-fit px-6 py-3 rounded-full border border-white/5 hover:bg-white/10 transition-colors">
                  {t('enterPortal')} <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </div>
             </div>
             
             {/* GLOW EFFECT */}
             <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity bg-primary duration-1000`} />
           </Link>
        ))}
        
      </div>
      
      {/* TRUST LAYER COMPONENT */}
      <div className="mt-20">
         <TrustLayer />
      </div>

      {/* LEGAL FOOTER LINKS */}
      <div className="mt-24 border-t border-white/5 pt-12 flex flex-col items-center gap-8">
        <div className="flex flex-wrap justify-center gap-8">
           <Link to="/terms" className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-white transition-colors">{t('termsConditions')}</Link>
           <Link to="/privacy" className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-white transition-colors">{t('privacyPolicy')}</Link>
           <div className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">{t('trustedByUsers')}</div>
        </div>
        
        <div className="flex gap-8 opacity-20 hover:opacity-100 transition-opacity grayscale hover:grayscale-0 duration-500">
             <div className="font-black text-xl italic tracking-tighter">BITCOIN</div>
             <div className="font-black text-xl italic tracking-tighter">USDT</div>
             <div className="font-black text-xl italic tracking-tighter">WHISH MONEY</div>
        </div>
        
        <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.5em]">© 2026 CEDAR CARD ENGINE . ALL RIGHTS RESERVED</p>
      </div>
    </div>
  );
}
