require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const { verifyToken, requireAdmin, requireMember } = require('./middleware/auth');

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

app.use(cors());
app.use(express.json());

const AUTH   = process.env.AUTH_SERVICE_URL         || 'http://localhost:3001';
const MEMBER = process.env.MEMBER_SERVICE_URL        || 'http://localhost:3002';
const PLAN   = process.env.PLAN_SERVICE_URL          || 'http://localhost:3003';
const TRAINER= process.env.TRAINER_SERVICE_URL       || 'http://localhost:3004';
const NOTIF  = process.env.NOTIFICATION_SERVICE_URL  || 'http://localhost:3005';

// ─── Forward helper ───────────────────────────────────────────────────────────
async function forward(req, res, targetUrl) {
  const headers = { 'Content-Type': 'application/json' };

  if (req.user) {
    headers['x-user-id']    = req.user.id;
    headers['x-user-role']  = req.user.role;
    headers['x-user-email'] = req.user.email;
  }

  const options = { method: req.method, headers };
  if (!['GET', 'DELETE'].includes(req.method) && req.body !== undefined) {
    options.body = JSON.stringify(req.body);
  }

  try {
    const upstream = await fetch(targetUrl, options);
    const ct = upstream.headers.get('content-type') || '';
    if (upstream.status === 204) return res.status(204).send();
    if (ct.includes('application/json')) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }
    return res.status(upstream.status).send();
  } catch (err) {
    console.error(`[Gateway] Failed to reach ${targetUrl}:`, err.message);
    return res.status(503).json({ message: 'Service unavailable', detail: err.message });
  }
}

// ─── Public: Auth ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => forward(req, res, `${AUTH}/auth/register`));
app.post('/api/auth/verify',   (req, res) => forward(req, res, `${AUTH}/auth/verify`));
app.post('/api/auth/login',    (req, res) => forward(req, res, `${AUTH}/auth/login`));

// ─── Admin: Members ───────────────────────────────────────────────────────────
app.get   ('/api/admin',                       verifyToken, requireAdmin, (req, res) => forward(req, res, `${MEMBER}/members`));
app.post  ('/api/admin',                       verifyToken, requireAdmin, (req, res) => forward(req, res, `${MEMBER}/members`));
app.get   ('/api/admin/:id',                   verifyToken, requireAdmin, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}`));
app.put   ('/api/admin/:id/update',            verifyToken, requireAdmin, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}/update`));
app.put   ('/api/admin/:id/Freeze',            verifyToken, requireAdmin, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}/freeze`));
app.put   ('/api/admin/:id/Unfreeze',          verifyToken, requireAdmin, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}/unfreeze`));
app.put   ('/api/admin/:id/Renew',             verifyToken, requireAdmin, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}/renew`));
app.put   ('/api/admin/:id/update-session-count', verifyToken, requireAdmin, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}/update-session-count`));
app.delete('/api/admin/:id',                   verifyToken, requireAdmin, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}`));

// ─── Member: Self-service (specific routes before /:id) ──────────────────────
app.get('/api/member/plans',    verifyToken, requireMember, (req, res) => forward(req, res, `${PLAN}/plans`));
app.get('/api/member/trainers', verifyToken, requireMember, (req, res) => forward(req, res, `${TRAINER}/trainers`));
app.get('/api/member/:id',      verifyToken, requireMember, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}`));
app.put ('/api/member/:id/renew',    verifyToken, requireMember, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}/renew`));
app.put ('/api/member/:id/freeze',   verifyToken, requireMember, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}/freeze`));
app.put ('/api/member/:id/unfreeze', verifyToken, requireMember, (req, res) => forward(req, res, `${MEMBER}/members/${req.params.id}/unfreeze`));

// ─── Admin: Trainers ──────────────────────────────────────────────────────────
app.get   ('/api/trainer',     verifyToken, requireAdmin, (req, res) => forward(req, res, `${TRAINER}/trainers`));
app.get   ('/api/trainer/:id', verifyToken, requireAdmin, (req, res) => forward(req, res, `${TRAINER}/trainers/${req.params.id}`));
app.post  ('/api/trainer',     verifyToken, requireAdmin, (req, res) => forward(req, res, `${TRAINER}/trainers`));
app.delete('/api/trainer/:id', verifyToken, requireAdmin, (req, res) => forward(req, res, `${TRAINER}/trainers/${req.params.id}`));

// ─── Admin: Plans ─────────────────────────────────────────────────────────────
app.get   ('/api/plan',      verifyToken, requireAdmin, (req, res) => forward(req, res, `${PLAN}/plans`));
app.post  ('/api/plan',      verifyToken, requireAdmin, (req, res) => forward(req, res, `${PLAN}/plans`));
app.get   ('/api/plan/:id',  verifyToken, requireAdmin, (req, res) => forward(req, res, `${PLAN}/plans/${req.params.id}`));
app.put   ('/api/plan/:id',  verifyToken, requireAdmin, (req, res) => forward(req, res, `${PLAN}/plans/${req.params.id}`));
app.delete('/api/plan/:id',  verifyToken, requireAdmin, (req, res) => forward(req, res, `${PLAN}/plans/${req.params.id}`));

// ─── Notifications ────────────────────────────────────────────────────────────
app.get('/api/notifications/:userId', verifyToken, (req, res) => forward(req, res, `${NOTIF}/notifications/${req.params.userId}`));
app.put('/api/notifications/:id/read', verifyToken, (req, res) => forward(req, res, `${NOTIF}/notifications/${req.params.id}/read`));

// ─── Root ─────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ message: 'Welcome to MyGym API Gateway!' }));

app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
