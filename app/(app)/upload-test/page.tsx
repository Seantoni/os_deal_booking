import { requirePageAccess } from '@/lib/auth/page-access'
import AppLayout from '@/components/common/AppLayout'
import UploadTestClient from './UploadTestClient'

export default async function UploadTestPage() {
  // Check role-based access
  await requirePageAccess('/upload-test')

  return (
    <AppLayout title="Image Upload Test">
      <UploadTestClient />
    </AppLayout>
  )
}
