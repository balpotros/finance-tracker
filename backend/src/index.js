require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { checkJwt, attachUser } = require('./middleware/auth');

const usersRouter    = require('./routes/users');
const expensesRouter = require('./routes/expenses');
const incomeRouter   = require('./routes/income');
const budgetRouter   = require('./routes/budget');
const dashboardRouter = require('./routes/dashboard');
const importRouter   = require('./routes/import');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Health check (no auth)
app.get('/health', (_req, res) => res.json({ ok: true }));

// All routes below require a valid JWT + local user record
app.use('/api', checkJwt, attachUser);
app.use('/api/users',    usersRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/income',   incomeRouter);
app.use('/api/budget',   budgetRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/import',   importRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Finance Tracker API running on port ${PORT}`));
