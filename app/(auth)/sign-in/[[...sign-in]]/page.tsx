'use client'

import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
      <div className="w-full max-w-[400px] p-4">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-sm ring-1 ring-slate-200 mb-6 bg-white">
            <Image 
              src="/icon.png" 
              alt="OfertaSimple Operations" 
              fill 
              className="object-cover"
              sizes="64px"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">OfertaSimple Operations</h1>
          <p className="text-slate-500 mt-2 text-sm font-medium">Gestión integral de procesos A-Z</p>
        </div>
        
        <SignIn 
          appearance={{
            layout: {
              socialButtonsPlacement: 'bottom',
              socialButtonsVariant: 'blockButton',
            },
            variables: {
              colorPrimary: '#e84c0f', // Brand orange
              colorText: '#0f172a', // slate-900
              colorTextSecondary: '#64748b', // slate-500
              colorBackground: '#ffffff',
              fontFamily: 'var(--font-geist-sans)',
              borderRadius: '0.75rem', // rounded-xl
            },
            elements: {
              rootBox: "w-full",
              card: "shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 w-full rounded-2xl p-8 bg-white",
              headerTitle: "hidden", 
              headerSubtitle: "hidden",
              header: "!hidden", 
              logoBox: "!hidden",
              logoImage: "!hidden",
              formButtonPrimary: "bg-[#e84c0f] hover:bg-[#d6450d] text-sm normal-case shadow-sm hover:shadow-md transition-all duration-200 h-10",
              footerActionLink: "text-[#e84c0f] hover:text-[#d6450d] font-medium",
              formFieldInput: "rounded-xl border-slate-200 focus:border-[#e84c0f] focus:ring-[#e84c0f]/20 bg-slate-50/50 transition-all h-10",
              formFieldLabel: "text-slate-600 font-medium text-xs uppercase tracking-wide mb-1.5",
              dividerLine: "bg-slate-100",
              dividerText: "text-slate-400 bg-white px-3 text-xs font-medium uppercase",
              socialButtonsBlockButton: "border-slate-200 hover:bg-slate-50 text-slate-600 h-10",
              socialButtonsBlockButtonText: "font-medium text-slate-600",
              identityPreviewText: "text-slate-700 font-medium",
              identityPreviewEditButton: "text-[#e84c0f] hover:text-[#d6450d]",
            }
          }}
        />
        
        <div className="mt-8 text-center text-[11px] text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} OfertaSimple. Todos los derechos reservados.
        </div>
      </div>
    </div>
  )
}
