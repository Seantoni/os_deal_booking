import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/roles'
import SettingsPageClient from './SettingsPageClient'

export default async function SettingsPage() {
  // Check if user is admin
  const admin = await isAdmin()
  
  if (!admin) {
    // Redirect non-admin users to events page
    redirect('/events')
  }

  return <SettingsPageClient />
}
