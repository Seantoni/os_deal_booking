import { redirect } from 'next/navigation'

export default async function Home() {
  // Redirect to events page (homepage is now in settings)
  redirect('/dashboard')
}
