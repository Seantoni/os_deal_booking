'use client'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

interface AiVoiceVisualizerProps {
  mode: 'listening' | 'processing' | 'idle'
  className?: string
}

export default function AiVoiceVisualizer({ mode, className }: AiVoiceVisualizerProps) {
  // Pre-calculate animation delays for a "random" look
  const bars = [
    { delay: '0.1s', duration: '1.2s' },
    { delay: '0.3s', duration: '0.8s' },
    { delay: '0.5s', duration: '1.5s' },
    { delay: '0.2s', duration: '1.0s' },
    { delay: '0.4s', duration: '1.3s' },
    { delay: '0.1s', duration: '0.9s' },
    { delay: '0.6s', duration: '1.4s' },
    { delay: '0.3s', duration: '1.1s' },
    { delay: '0.5s', duration: '1.6s' },
    { delay: '0.2s', duration: '0.7s' },
    { delay: '0.4s', duration: '1.2s' },
    { delay: '0.1s', duration: '1.0s' },
  ]

  return (
    <div className={cn("relative flex items-center justify-center h-40 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200 shadow-inner", className)}>
      
      {/* Background Glow - Listening */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-700",
        mode === 'listening' ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-400/5 rounded-full blur-3xl animate-pulse delay-150" />
      </div>
      
      {/* Background Glow - Processing */}
      <div className={cn(
        "absolute inset-0 transition-opacity duration-700",
        mode === 'processing' ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-400/5 rounded-full blur-3xl animate-pulse delay-150" />
      </div>

      {/* LISTENING STATE: Audio Waveform */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center gap-1.5 transition-all duration-500 z-10",
        mode === 'listening' ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4 pointer-events-none"
      )}>
        {bars.map((bar, i) => (
          <div
            key={i}
            className="w-1.5 rounded-full bg-gradient-to-t from-rose-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
            style={{
              height: '8px',
              animation: `soundWave ${bar.duration} ease-in-out infinite alternate`,
              animationDelay: bar.delay
            }}
          />
        ))}
      </div>

      {/* PROCESSING STATE: Orbital Loader */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center transition-all duration-500 z-10",
        mode === 'processing' ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-90 translate-y-4 pointer-events-none"
      )}>
        {/* Core */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          {/* Outer Ring */}
          <div className="absolute inset-0 rounded-full border-[3px] border-indigo-100 opacity-40" />
          <div className="absolute inset-0 rounded-full border-t-[3px] border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] animate-spin" />
          
          {/* Inner Ring */}
          <div className="absolute inset-3 rounded-full border-r-[3px] border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)] animate-[spin_1.5s_linear_infinite_reverse]" />
          
          {/* Center Dot */}
          <div className="w-3 h-3 bg-indigo-600 rounded-full shadow-[0_0_12px_rgba(79,70,229,0.8)] animate-pulse" />
        </div>
        
        {/* Orbiting Particles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 animate-[spin_4s_linear_infinite]">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-400 rounded-full blur-[0.5px] shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 animate-[spin_3s_linear_infinite_reverse]">
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-sky-400 rounded-full blur-[0.5px] shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        </div>
      </div>

    </div>
  )
}
