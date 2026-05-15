const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// POST /send  — called internally as /internal/send by other services
router.post('/send', async (req, res) => {
  const { userId, content } = req.body;
  if (!userId || !content)
    return res.status(400).json({ message: 'userId and content required' });

  try {
    const notification = await prisma.notification.create({
      data: { userId, content, isRead: false }
    });
    await prisma.user.update({
      where: { id: userId },
      data: { notificationCount: { increment: 1 } }
    });
    res.status(201).json(notification);
  } catch (err) {
    console.error('[Notification] Failed to create notification:', err.message);
    res.status(500).json({ message: 'Failed to create notification' });
  }
});

// GET /:userId  — get all notifications for a user
router.get('/:userId', async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.params.userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// PUT /:id/read  — mark notification as read
router.put('/:id/read', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    if (!notification.isRead) {
      await prisma.$transaction([
        prisma.notification.update({ where: { id }, data: { isRead: true } }),
        prisma.user.updateMany({
          where: { id: notification.userId, notificationCount: { gt: 0 } },
          data: { notificationCount: { decrement: 1 } }
        })
      ]);
    }

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

module.exports = router;
