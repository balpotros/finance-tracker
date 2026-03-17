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
const importRouter      = require('./routes/import');
const categoriesRouter  = require('./routes/categories');

const app = express();

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin === o || origin.endsWith('.vercel.app'))) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
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
app.use('/api/import',      importRouter);
app.use('/api/categories',  categoriesRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Finance Tracker API running on port ${PORT}`));
