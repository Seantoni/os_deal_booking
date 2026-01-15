import { prisma } from './lib/prisma';

async function main() {
  const users = await prisma.userProfile.findMany({
    select: { id: true, clerkId: true, email: true, name: true, isActive: true },
    orderBy: { email: 'asc' }
  });
  
  console.log('All users in DB:');
  for (const u of users) {
    console.log(`  ${u.email || '(no email)'} | ${u.name || '(no name)'} | active=${u.isActive} | clerkId=${u.clerkId.slice(0,10)}...`);
  }
  
  // Find duplicates
  const emailCounts: Record<string, number> = {};
  for (const u of users) {
    const e = (u.email || '').toLowerCase();
    if (e) emailCounts[e] = (emailCounts[e] || 0) + 1;
  }
  
  console.log('\nDuplicate emails:');
  let hasDuplicates = false;
  for (const [email, count] of Object.entries(emailCounts)) {
    if (count > 1) {
      console.log(`  ${email}: ${count} entries`);
      hasDuplicates = true;
    }
  }
  if (!hasDuplicates) console.log('  None');
}

main().catch(console.error).finally(() => prisma.$disconnect());
