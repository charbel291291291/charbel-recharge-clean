import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Zap, Wallet, Gamepad2, Rocket } from 'lucide-react';

export default function HomePage() {
  const portalCards = [
    {
      title: "Hub Center",
      description: "Access your atomic ledger. Manage your wallet balance, check pending orders, and view transaction history.",
      icon: Wallet,
      image: "/assets/hub_wallet.png",
      link: "/dashboard",
      color: "from-blue-500/20 to-cyan-500/20",
      accent: "text-blue-400",
      border: "hover:border-blue-500/40"
    },
    {
      title: "Charbel Card",
      description: "Instant Game Recharge. PUBG UC, Steam, and mobile top-ups for your favorite games at the best rates in the market.",
      icon: Gamepad2,
      image: "/assets/hub_gaming.png",
      link: "/charbel-card",
      color: "from-emerald-500/20 to-teal-500/20",
      accent: "text-emerald-400",
      border: "hover:border-emerald-500/40"
    },
    {
      title: "SMM Engine",
      description: "Automated Social Growth. Boost followers, likes, and engagement across all major social platforms using SMM Engine APIs.",
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
      
      {/* HERO SECTION */}
      <div className="text-center max-w-4xl mx-auto mb-16 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[160px] -z-10" />
        <div className="flex items-center justify-center gap-3 mb-6 animate-bounce">
           <Zap className="w-5 h-5 text-primary fill-primary" />
           <span className="text-xs font-black uppercase tracking-[0.5em] text-muted-foreground opacity-70">Unified HUB Control</span>
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-none bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent italic">
          Choose Your Path.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-bold max-w-2xl mx-auto leading-relaxed opacity-80">
          Welcome to the next generation of digital asset exchange. 
          Everything is secured by the <span className="text-foreground">Charbel Atomic Ledger</span> logic.
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
                  ENTER PORTAL <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                </div>
             </div>
             
             {/* GLOW EFFECT */}
             <div className={`absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity bg-primary duration-1000`} />
           </Link>
        ))}
        
      </div>
      
      {/* TRUST BADGE */}
      <div className="mt-20 flex flex-col items-center gap-6 animate-fade-in delay-700">
        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.4em] bg-card/60 backdrop-blur-xl py-4 px-10 rounded-full border border-white/5 shadow-2xl shadow-black/40">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="opacity-50">Charbel HUB Protected System</span>
        </div>
        <div className="flex gap-8 opacity-20 hover:opacity-100 transition-opacity grayscale hover:grayscale-0 duration-500">
             <div className="font-black text-xl italic tracking-tighter">BITCOIN</div>
             <div className="font-black text-xl italic tracking-tighter">USDT</div>
             <div className="font-black text-xl italic tracking-tighter">WHISH</div>
        </div>
      </div>
    </div>
  );
}
