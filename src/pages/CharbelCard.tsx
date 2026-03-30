import React from 'react';

export default function CharbelCardPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-500">
      <div className="bg-card/40 p-12 rounded-[3rem] border border-border/50 backdrop-blur-md shadow-2xl max-w-lg">
        <h1 className="text-4xl font-black tracking-tighter mb-4 bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent italic">
          HUB Workspace
        </h1>
        <p className="text-muted-foreground font-bold text-sm leading-relaxed opacity-70">
          This section has been cleared as requested. <br />
          You can now start re-adding your custom categories and layouts here.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
           <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
           <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.2s]" />
           <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0.4s]" />
        </div>
      </div>
    </div>
  );
}
