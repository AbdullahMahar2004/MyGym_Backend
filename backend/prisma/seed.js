const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@yourdomain.com';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const passwordHash = await bcrypt.hash('Admin!2345Secure', 10);
    await prisma.user.create({
      data: { username: 'admin', email: adminEmail, passwordHash, role: 'Admin' }
    });
    console.log('Admin user created: admin@yourdomain.com / Admin!2345Secure');
  } else {
    console.log('Admin user already exists.');
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
