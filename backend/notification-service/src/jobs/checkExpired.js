const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkExpiredMemberships() {
  console.log('[Notification] Running expiry check job...');
  try {
    // Ask member service for all expired members that have an account
    const resp = await fetch(`${process.env.MEMBER_SERVICE_URL}/members/internal/all-active`);
    if (!resp.ok) {
      console.error('[Notification] Failed to fetch expired members');
      return;
    }
    const expired = await resp.json(); // [{ userId }]

    for (const { userId } of expired) {
      if (!userId) continue;
      // Check if we already sent this notification today to avoid spam
      const recent = await prisma.notification.findFirst({
        where: {
          userId,
          content: { contains: 'Plan Has Expired' },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });
      if (recent) continue;

      await prisma.notification.create({
        data: {
          userId,
          content: 'Your Plan Has Expired. Please renew to continue enjoying our Gym.',
          isRead: false
        }
      });
      await prisma.user.update({
        where: { id: userId },
        data: { notificationCount: { increment: 1 } }
      });
    }
    console.log(`[Notification] Expiry job done. Processed ${expired.length} expired memberships.`);
  } catch (err) {
    console.error('[Notification] Expiry job error:', err.message);
  }
}

module.exports = { checkExpiredMemberships };
