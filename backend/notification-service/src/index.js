require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const notifRoutes = require('./routes/notifications');
const { checkExpiredMemberships } = require('./jobs/checkExpired');

const app = express();
const PORT = process.env.NOTIFICATION_PORT || 3005;

app.use(cors());
app.use(express.json());

// Health must be defined before wildcard routes
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service' }));

// User-facing routes: GET /notifications/:userId  PUT /notifications/:id/read
app.use('/notifications', notifRoutes);

// Internal inter-service route: POST /internal/send → router handles POST /send
app.use('/internal', notifRoutes);

// Daily expiry check at midnight
cron.schedule('0 0 * * *', () => checkExpiredMemberships());

app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
  checkExpiredMemberships();
});
