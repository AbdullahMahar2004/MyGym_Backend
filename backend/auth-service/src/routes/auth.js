const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// In-memory verification code store: email -> { code, expiry }
const verificationCodes = new Map();

function generateCode() {
  return Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d', issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE }
  );
}

// POST /auth/register
// Checks member email exists, generates verification code
router.post('/register', async (req, res) => {
  const { email, password, confirmPassword, userName } = req.body;

  if (!userName || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  if (password !== confirmPassword)
    return res.status(400).json({ message: 'Password and Confirm Password do not match' });

  // Check member exists in gym records (inter-service call)
  try {
    const memberResp = await fetch(
      `${process.env.MEMBER_SERVICE_URL}/members/internal/check-email/${encodeURIComponent(email)}`
    );
    const memberData = await memberResp.json();
    if (!memberData.exists)
      return res.status(400).json({ message: 'You need to register your email at the gym first' });
  } catch {
    return res.status(503).json({ message: 'Member service unavailable' });
  }

  // Check username not taken
  const existing = await prisma.user.findUnique({ where: { username: userName } });
  if (existing)
    return res.status(400).json({ message: 'User already exists with this username' });

  const code = generateCode();
  verificationCodes.set(email, { code, expiry: Date.now() + 10 * 60 * 1000 });
  console.log(`[Auth] Verification code for ${email}: ${code}`);

  res.json({ model: { email, userName }, message: 'Verification code sent to your email.' });
});

// POST /auth/verify
// Verifies code, creates user, links member record, sends welcome notification
router.post('/verify', async (req, res) => {
  const { email, password, userName, code } = req.body;

  const stored = verificationCodes.get(email);
  if (!stored || stored.code !== parseInt(code) || stored.expiry < Date.now())
    return res.status(400).json({ message: 'Invalid or expired verification code' });

  verificationCodes.delete(email);

  const passwordHash = await bcrypt.hash(password, 10);
  let user;
  try {
    user = await prisma.user.create({
      data: { username: userName, email, passwordHash, role: 'Member' }
    });
  } catch (err) {
    return res.status(400).json({ message: 'User registration failed', error: err.message });
  }

  // Link user to member record
  try {
    await fetch(`${process.env.MEMBER_SERVICE_URL}/members/internal/set-user-id`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId: user.id })
    });
  } catch {
    console.error('[Auth] Failed to link user to member');
  }

  // Send welcome notification
  try {
    await fetch(`${process.env.NOTIFICATION_SERVICE_URL}/internal/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        content: 'Welcome to MyGym! Your account has been created successfully.'
      })
    });
  } catch {
    console.error('[Auth] Failed to send welcome notification');
  }

  res.json({ message: 'User registered successfully', userId: user.id });
});

// POST /auth/login
// Returns JWT + memberId if member account exists
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'Email and password are required' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ message: 'Email or Password are incorrect' });

  const token = generateToken(user);

  // Try to get the linked member id
  try {
    const resp = await fetch(
      `${process.env.MEMBER_SERVICE_URL}/members/internal/by-user-id/${user.id}`
    );
    if (resp.ok) {
      const data = await resp.json();
      return res.json({ token, id: data.id });
    }
  } catch {
    // Admin has no member record — that's fine
  }

  res.json({ token });
});

module.exports = router;
