const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { isActive, isFrozen, toDto } = require('../helpers/member');

const router = express.Router();
const prisma = new PrismaClient();

const INCLUDE = { plan: true, trainer: true, user: true };

async function notifyUser(userId, content) {
  try {
    await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/internal/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, content })
    });
  } catch {
    console.error('[Member] Failed to send notification to', userId);
  }
}

// ─── Internal routes (must be before /:id) ────────────────────────────────────

// GET /internal/check-email/:email  — auth-service uses this
router.get('/internal/check-email/:email', async (req, res) => {
  const member = await prisma.member.findUnique({ where: { email: req.params.email } });
  res.json({ exists: !!member });
});

// PATCH /internal/set-user-id  — auth-service calls this after verify
router.patch('/internal/set-user-id', async (req, res) => {
  const { email, userId } = req.body;
  const member = await prisma.member.findUnique({ where: { email } });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  await prisma.member.update({ where: { email }, data: { userId } });
  res.json({ message: 'UserId linked' });
});

// GET /internal/by-user-id/:userId  — auth-service uses this at login
router.get('/internal/by-user-id/:userId', async (req, res) => {
  const member = await prisma.member.findUnique({ where: { userId: req.params.userId } });
  if (!member) return res.status(404).json({ message: 'Not found' });
  res.json({ id: member.id });
});

// GET /internal/all-active  — notification-service uses this for expiry job
router.get('/internal/all-active', async (req, res) => {
  const members = await prisma.member.findMany({
    where: { userId: { not: null } },
    include: INCLUDE
  });
  const expired = members
    .filter(m => !isActive(m))
    .map(m => ({ userId: m.userId }));
  res.json(expired);
});

// ─── Collection routes ────────────────────────────────────────────────────────

// GET /members  (Admin)
router.get('/', async (_req, res) => {
  const members = await prisma.member.findMany({ include: INCLUDE });
  res.json(members.map(toDto));
});

// POST /members  (Admin)
router.post('/', async (req, res) => {
  const { email, phoneNumber, name, planId, trainerId } = req.body;

  if (!email || !phoneNumber || !name || !planId)
    return res.status(400).json({ message: 'Invalid member data or duplicate email/phone.' });

  const [emailExists, phoneExists] = await Promise.all([
    prisma.member.findUnique({ where: { email } }),
    prisma.member.findUnique({ where: { phoneNumber } })
  ]);
  if (emailExists || phoneExists)
    return res.status(400).json({ message: 'Invalid member data or duplicate email/phone.' });

  const plan = await prisma.plan.findUnique({ where: { id: Number(planId) } });
  if (!plan) return res.status(400).json({ message: 'Plan not found.' });

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + plan.duration);

  const member = await prisma.member.create({
    data: {
      name, email, phoneNumber,
      planId: Number(planId),
      trainerId: trainerId ? Number(trainerId) : null,
      startDate, endDate,
      sessionCount: 0
    },
    include: INCLUDE
  });

  let payment = plan.price;
  if (member.trainer) payment += plan.price * 0.30;

  res.status(201).json({ member: toDto(member), payment: parseFloat(payment.toFixed(2)) });
});

// ─── Single-member routes ─────────────────────────────────────────────────────

// GET /members/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

  const member = await prisma.member.findUnique({ where: { id }, include: INCLUDE });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  // Ownership check for Member role — gateway forwards X-User-Role / X-User-Id
  const role = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];
  if (role === 'Member' && member.userId !== userId)
    return res.status(403).json({ message: 'Forbidden' });

  res.json(toDto(member));
});

// PUT /members/:id/update  (Admin)
router.put('/:id/update', async (req, res) => {
  const id = parseInt(req.params.id);
  const { email, phoneNumber } = req.body;

  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  const updates = {};
  if (email) updates.email = email;
  if (phoneNumber) updates.phoneNumber = phoneNumber;

  await prisma.member.update({ where: { id }, data: updates });

  if (email && member.userId) {
    await prisma.user.update({ where: { id: member.userId }, data: { email } });
    await notifyUser(member.userId, 'Your account has been updated successfully.');
  }

  res.status(204).send();
});

// DELETE /members/:id  (Admin)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  await prisma.member.delete({ where: { id } });
  res.status(204).send();
});

// PUT /members/:id/update-session-count  (Admin)
router.put('/:id/update-session-count', async (req, res) => {
  const id = parseInt(req.params.id);
  const member = await prisma.member.findUnique({ where: { id }, include: INCLUDE });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (isFrozen(member))
    return res.status(400).json({ message: 'Member is frozen and cannot update session count. You can unfreeze the member first.' });
  if (!isActive(member))
    return res.status(400).json({ message: 'Please renew your subscription.' });

  const newCount = member.sessionCount + 1;
  await prisma.member.update({ where: { id }, data: { sessionCount: newCount } });

  if (member.userId && newCount === member.plan.numberOfSessions) {
    await notifyUser(member.userId, 'You have consumed all your sessions. Please renew your membership.');
  }

  res.status(204).send();
});

// PUT /members/:id/freeze
router.put('/:id/freeze', async (req, res) => {
  const id = parseInt(req.params.id);
  // Body can be a raw number or { frozenDuration: number }
  const frozenDuration = typeof req.body === 'number'
    ? req.body
    : parseInt(req.body?.frozenDuration ?? req.body);

  const member = await prisma.member.findUnique({ where: { id }, include: INCLUDE });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  if (isFrozen(member))
    return res.status(400).json({ message: 'Member is already frozen.' });
  if (!frozenDuration || isNaN(frozenDuration))
    return res.status(400).json({ message: 'Frozen duration is not set.' });
  if (member.plan.isSessional || frozenDuration > member.plan.duration * 30 * (1 / 3))
    return res.status(400).json({ message: 'Cannot freeze for more than 1/3 of the plan duration or sessional plans' });
  if (!isActive(member))
    return res.status(400).json({ message: 'Member is already inactive and cannot be frozen.' });

  const freezeStartDate = new Date();
  const freezeEndDate = new Date(freezeStartDate);
  freezeEndDate.setDate(freezeEndDate.getDate() + frozenDuration);
  const newEndDate = new Date(member.endDate);
  newEndDate.setDate(newEndDate.getDate() + frozenDuration);

  await prisma.member.update({
    where: { id },
    data: { freezeStartDate, freezeEndDate, frozenDuration, endDate: newEndDate }
  });

  if (member.userId)
    await notifyUser(member.userId, 'Your membership has been frozen successfully.');

  res.status(204).send();
});

// PUT /members/:id/unfreeze
router.put('/:id/unfreeze', async (req, res) => {
  const id = parseInt(req.params.id);
  const member = await prisma.member.findUnique({ where: { id }, include: INCLUDE });
  if (!member) return res.status(404).json({ message: 'Member not found' });
  if (!isFrozen(member))
    return res.status(400).json({ message: 'Member is not frozen.' });
  if (!isActive(member))
    return res.status(400).json({ message: 'Member is already inactive and cannot be reactivated.' });

  // Subtract remaining freeze time from end date
  const now = new Date();
  const remainingMs = new Date(member.freezeEndDate) - now;
  const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
  const newEndDate = new Date(member.endDate);
  newEndDate.setDate(newEndDate.getDate() - remainingDays);

  await prisma.member.update({
    where: { id },
    data: { freezeStartDate: null, freezeEndDate: null, frozenDuration: null, endDate: newEndDate }
  });

  if (member.userId)
    await notifyUser(member.userId, 'Your membership has been unfrozen successfully.');

  res.status(204).send();
});

// PUT /members/:id/renew
router.put('/:id/renew', async (req, res) => {
  const id = parseInt(req.params.id);
  const { planId, trainerId } = req.body;

  const member = await prisma.member.findUnique({ where: { id }, include: INCLUDE });
  if (!member) return res.status(404).json({ message: 'Member not found' });

  // Ownership check for Member role
  const role = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];
  if (role === 'Member' && member.userId !== userId)
    return res.status(403).json({ message: 'Forbidden' });

  if (isActive(member))
    return res.status(400).json({ message: 'Member does not need to renew.' });

  const newPlan = await prisma.plan.findUnique({ where: { id: Number(planId) } });
  if (!newPlan) return res.status(404).json({ message: 'New plan not found.' });

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + newPlan.duration);

  const updated = await prisma.member.update({
    where: { id },
    data: {
      planId: newPlan.id,
      startDate, endDate,
      sessionCount: 0,
      trainerId: trainerId ? Number(trainerId) : null
    },
    include: INCLUDE
  });

  let payment = newPlan.price;
  if (updated.trainer) payment += newPlan.price * 0.30;

  if (member.userId)
    await notifyUser(member.userId, 'Your membership has been renewed successfully.');

  res.json({ message: 'Member renewed successfully', payment: parseFloat(payment.toFixed(2)) });
});

module.exports = router;
