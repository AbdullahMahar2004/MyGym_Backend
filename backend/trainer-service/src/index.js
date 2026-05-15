require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const trainerRoutes = require('./routes/trainers');

const app = express();
const PORT = process.env.TRAINER_PORT || 3004;

app.use(cors());
app.use(express.json());

app.use('/trainers', trainerRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'trainer-service' }));

app.listen(PORT, () => console.log(`Trainer Service running on port ${PORT}`));
