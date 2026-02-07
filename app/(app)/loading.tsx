import Image from 'next/image'

/**
 * App-level loading screen.
 * Shows while the (app) layout fetches server data (categories, users, role)
 * after login or on first navigation into the app.
 */
export default function AppLoading() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
      {/* Logo */}
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] mb-6">
        <Image src="/icon.png" alt="OS Deals" fill className="object-cover" priority />
      </div>

      {/* Spinner */}
      <div className="relative mb-4">
        <div className="h-8 w-8 rounded-full border-[2.5px] border-gray-200" />
        <div className="absolute inset-0 h-8 w-8 rounded-full border-[2.5px] border-blue-500 border-t-transparent animate-spin" />
      </div>

      {/* Text */}
      <p className="text-sm font-medium text-gray-500 tracking-wide">Cargando</p>
    </div>
  )
}
