require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const memberRoutes = require('./routes/members');

const app = express();
const PORT = process.env.MEMBER_PORT || 3002;

app.use(cors());
app.use(express.json());

app.use('/members', memberRoutes);
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'member-service' }));

app.listen(PORT, () => console.log(`Member Service running on port ${PORT}`));
