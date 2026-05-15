const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /trainers
router.get('/', async (_req, res) => {
  const trainers = await prisma.trainer.findMany();
  res.json(trainers);
});

// GET /trainers/:id
router.get('/:id', async (req, res) => {
  const trainer = await prisma.trainer.findUnique({ where: { id: parseInt(req.params.id) } });
  if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
  res.json(trainer);
});

// POST /trainers  (Admin)
router.post('/', async (req, res) => {
  const { name, phoneNumber, specialization } = req.body;
  if (!name || !phoneNumber || !specialization)
    return res.status(400).json({ message: 'name, phoneNumber, and specialization are required' });

  const trainer = await prisma.trainer.create({
    data: { name, phoneNumber, specialization }
  });
  res.status(201).json(trainer);
});

// DELETE /trainers/:id  (Admin)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid id' });

  const trainer = await prisma.trainer.findUnique({ where: { id } });
  if (!trainer) return res.status(404).json({ message: 'Trainer not found' });

  await prisma.member.updateMany({ where: { trainerId: id }, data: { trainerId: null } });
  await prisma.trainer.delete({ where: { id } });
  res.status(204).send();
});

module.exports = router;
