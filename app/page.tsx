import { currentUser } from '@clerk/nextjs/server';
import { UserButton } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function Home() {
  const user = await currentUser();
  
  // Test database connection
  let dbStatus = 'Not connected';
  let dbError = null;
  try {
    await prisma.$connect();
    dbStatus = 'Connected';
  } catch (error) {
    dbStatus = 'Error';
    dbError = error instanceof Error ? error.message : 'Unknown error';
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Calendar Clone</h1>
          <UserButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* Connection Status Section */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
            
            <div className="space-y-3">
              {/* Clerk Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Clerk Authentication:</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}>
                  {user ? 'Connected' : 'Not Connected'}
                </span>
              </div>

              {/* Database Status */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700 font-medium">Database (Neon):</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  dbStatus === 'Connected' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                }`}>
                  {dbStatus}
                </span>
              </div>

              {dbError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  <strong>Database Error:</strong> {dbError}
                </div>
              )}
            </div>
          </div>

          {/* User Info Section */}
          {user && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>User ID:</strong> {user.id}
                </p>
                <p className="text-gray-700">
                  <strong>Email:</strong> {user.emailAddresses[0]?.emailAddress || 'N/A'}
                </p>
                <p className="text-gray-700">
                  <strong>Name:</strong> {user.firstName} {user.lastName}
                </p>
              </div>
            </div>
          )}

          {/* Ready to Use */}
          {user && dbStatus === 'Connected' && (
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Ready to Go!</h2>
              <p className="text-gray-700 mb-4">
                All systems are connected. You can now start creating events.
              </p>
              <Link
                href="/events"
                className="inline-block bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Events
              </Link>
            </div>
          )}

          {/* Next Steps Section */}
          {(!user || dbStatus !== 'Connected') && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Next Steps</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Make sure your .env file has the correct API keys</li>
                <li>Run database migrations with: <code className="bg-gray-200 px-2 py-1 rounded text-sm">npx prisma migrate dev --name init</code></li>
                <li>Generate Prisma client with: <code className="bg-gray-200 px-2 py-1 rounded text-sm">npx prisma generate</code></li>
                <li>Both status indicators above should show "Connected"</li>
              </ol>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
