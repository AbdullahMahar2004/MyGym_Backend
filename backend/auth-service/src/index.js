require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.AUTH_PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth-service' }));

app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
