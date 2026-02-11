import { redirect } from 'next/navigation'
import { getUserRole } from '@/lib/auth/roles'
import { getDefaultPageForRole } from '@/lib/auth/page-access'

export default async function Home() {
  const role = await getUserRole()
  const defaultPage = await getDefaultPageForRole(role)
  redirect(defaultPage)
}
