require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const planRoutes = require('./routes/plans');

const app = express();
const PORT = process.env.PLAN_PORT || 3003;

app.use(cors());
app.use(express.json());

app.use('/plans', planRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'plan-service' }));

app.listen(PORT, () => console.log(`Plan Service running on port ${PORT}`));
