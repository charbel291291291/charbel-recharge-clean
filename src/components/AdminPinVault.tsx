import { useState } from 'react';
import { X, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';

export default function AdminPinVault({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const SECRET_PIN = "1201";

  const handleKeypad = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin === SECRET_PIN) {
        setLoading(true);
        setTimeout(() => {
          onSuccess();
          toast.success("Access Granted. Welcome Administrator.");
        }, 800);
      } else if (newPin.length === 4) {
        toast.error("Invalid Security PIN");
        setPin('');
      }
    }
  };

  const clear = () => setPin('');

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[9999] flex items-center justify-center animate-in fade-in duration-500 overflow-hidden">
      {/* SECURITY BACKGROUND GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative w-full max-w-sm p-8 flex flex-col items-center">
        {/* HEADER */}
        <div className="mb-10 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(255,255,255,0.05)]">
             {loading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <Lock className="w-8 h-8 text-primary" />}
          </div>
          <h2 className="text-2xl font-black italic tracking-tighter text-white">Security Vault</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">Authentication Required</p>
        </div>

        {/* PIN DISPLAY */}
        <div className="flex gap-4 mb-12">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className={`w-12 h-16 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center ${
                pin.length > i ? 'border-primary bg-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.3)]' : 'border-white/10 bg-white/5'
              }`}
            >
              {pin.length > i && <div className="w-3 h-3 rounded-full bg-white animate-in zoom-in" />}
            </div>
          ))}
        </div>

        {/* KEYPAD */}
        <div className="grid grid-cols-3 gap-4 w-full mb-10">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeypad(num)}
              className="h-20 rounded-2xl bg-white/5 border border-white/10 text-xl font-black hover:bg-white/10 active:scale-90 transition-all text-white flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button onClick={clear} className="h-20 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center">Clear</button>
          <button onClick={() => handleKeypad('0')} className="h-20 rounded-2xl bg-white/5 border border-white/10 text-xl font-black hover:bg-white/10 active:scale-95 transition-all text-white flex items-center justify-center">0</button>
          <button onClick={onCancel} className="h-20 rounded-2xl bg-white/5 border border-white/10 text-muted-foreground hover:bg-destructive/20 hover:text-destructive active:scale-95 transition-all flex items-center justify-center">
             <X className="w-6 h-6" />
          </button>
        </div>

        {/* FOOTER */}
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
          <ShieldCheck className="w-3 h-3" /> Encrypted Protocol 12-A
        </div>
      </div>
    </div>
  );
}
