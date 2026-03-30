import { useState, useEffect } from 'react';
import { X, Lock, ShieldCheck, Loader2, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPinVault({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorShake, setErrorShake] = useState(false);
  
  const SECRET_PIN = "1201";

  // PREMIUM SOUND EFFECTS (BEEP)
  const playSound = (freq = 440, type: OscillatorType = 'sine', duration = 0.1) => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context blocked by browser policy until interaction.");
    }
  };

  const handleKeypad = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      playSound(660, 'triangle', 0.05); // Subtle tap sound
      
      if (newPin === SECRET_PIN) {
        setLoading(true);
        playSound(880, 'sine', 0.2); // Success high-pitch
        setTimeout(() => {
          onSuccess();
          toast.success("Identity Verified. Accessing Core Engine.");
        }, 800);
      } else if (newPin.length === 4) {
        playSound(220, 'square', 0.3); // Error low-pitch buzz
        setErrorShake(true);
        setTimeout(() => {
          setErrorShake(false);
          setPin('');
        }, 500);
        toast.error("Access Forbidden. Invalid Authorization.");
      }
    }
  };

  const clear = () => {
    setPin('');
    playSound(330, 'sine', 0.1);
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[9999] flex items-center justify-center animate-in fade-in zoom-in duration-500 overflow-hidden touch-none select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.05)_0%,transparent_70%)] pointer-events-none" />
      
      <div className={`relative w-full max-w-sm p-8 flex flex-col items-center transition-transform ${errorShake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
        
        {/* MUTED TOGGLE */}
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          className="absolute top-0 right-0 p-4 text-muted-foreground/30 hover:text-white transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* HEADER */}
        <div className="mb-12 text-center">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
             <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse" />
             <div className="relative w-full h-full rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-2xl backdrop-blur-xl">
                 {loading ? <Loader2 className="w-10 h-10 text-primary animate-spin" /> : <Lock className="w-10 h-10 text-primary group-hover:scale-110 transition-transform" />}
             </div>
          </div>
          <h2 className="text-3xl font-black italic tracking-tighter text-white drop-shadow-2xl">ENCRYPTED PORTAL</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary mt-2 opacity-50">Auth Level 4 Requested</p>
        </div>

        {/* PIN DISPLAY */}
        <div className="flex gap-4 mb-16">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className={`w-14 h-20 rounded-3xl border-2 transition-all duration-300 flex items-center justify-center shadow-2xl ${
                pin.length > i 
                  ? 'border-primary bg-primary/20 scale-110 glow-sm' 
                  : 'border-white/5 bg-white/5 opacity-40'
              }`}
            >
              <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
                 pin.length > i ? 'bg-white shadow-[0_0_15px_#fff]' : 'bg-transparent'
              }`} />
            </div>
          ))}
        </div>

        {/* KEYPAD GRID */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-[320px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeypad(num)}
              className="group h-20 rounded-[2.5rem] bg-white/5 border border-white/5 text-2xl font-black hover:bg-white/10 active:scale-[0.8] hover:border-primary/40 transition-all text-white flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative z-10">{num}</span>
              <span className="text-[8px] opacity-20 relative z-10 font-bold tracking-widest">{ ['','ABC','DEF','GHI','JKL','MNO','PQRS','TUV','WXYZ'][Number(num)-1] }</span>
            </button>
          ))}
          <button onClick={clear} className="h-20 rounded-[2.5rem] bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 active:scale-90 transition-all flex items-center justify-center">CLEAR</button>
          <button onClick={() => handleKeypad('0')} className="h-20 rounded-[2.5rem] bg-white/5 border border-white/5 text-2xl font-black hover:bg-white/10 active:scale-[0.8] transition-all text-white flex items-center justify-center">0</button>
          <button onClick={onCancel} className="h-20 rounded-[2.5rem] bg-white/5 border border-white/5 text-muted-foreground hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center group">
             <X className="w-8 h-8 group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* SECURITY LOGO */}
        <div className="mt-16 flex items-center gap-3 py-3 px-8 rounded-full bg-white/5 border border-white/5 opacity-20">
           <ShieldCheck className="w-3 h-3 text-emerald-500" />
           <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white">SECURE KERNEL 1201_A</span>
        </div>
      </div>
      
      {/* SHAKE ANIMATION CSS */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .glow-sm { box-shadow: 0 0 40px rgba(var(--primary), 0.2); }
      `}</style>
    </div>
  );
}
