const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

async function notifyAllMembers(content) {
  // Get all non-admin users with linked member accounts
  const users = await prisma.user.findMany({
    where: { role: 'Member' }
  });
  for (const user of users) {
    try {
      await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/internal/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, content })
      });
    } catch {
      console.error('[Plan] Failed to notify user', user.id);
    }
  }
}

// GET /plans
router.get('/', async (_req, res) => {
  const plans = await prisma.plan.findMany();
  res.json(plans);
});

// GET /plans/:id
router.get('/:id', async (req, res) => {
  const plan = await prisma.plan.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  res.json(plan);
});

// POST /plans  (Admin)
router.post('/', async (req, res) => {
  let { name, isSessional, numberOfSessions, duration, price } = req.body;

  if (!isSessional) {
    numberOfSessions = -1;
  } else {
    duration = 1;
  }

  const plan = await prisma.plan.create({
    data: {
      name,
      isSessional: Boolean(isSessional),
      numberOfSessions: Number(numberOfSessions),
      duration: Number(duration),
      price: Number(price)
    }
  });

  await notifyAllMembers(
    `New Plan Added: ${plan.name} for ${plan.duration} Month(s) at ${plan.price} Rs. per month.`
  );

  res.status(201).json(plan);
});

// PUT /plans/:id  (Admin) — updates price only
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  // Body may be a raw number or { price: number }
  const newPrice = typeof req.body === 'number' ? req.body : Number(req.body?.price ?? req.body);

  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  const updated = await prisma.plan.update({ where: { id }, data: { price: newPrice } });

  await notifyAllMembers(
    `New Offer on: ${updated.name} Plan, ${updated.duration} Month(s) at ${updated.price} Rs. per month.`
  );

  res.status(204).send();
});

// DELETE /plans/:id  (Admin)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const plan = await prisma.plan.findUnique({ where: { id }, include: { members: true } });
  if (!plan) return res.status(404).json({ message: 'Plan not found' });
  if (plan.members.length > 0)
    return res.status(400).json({ message: `Cannot delete plan — ${plan.members.length} member(s) are currently on it.` });
  await prisma.plan.delete({ where: { id } });
  res.status(204).send();
});

module.exports = router;
