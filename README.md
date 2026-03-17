# Finance Tracker

A household finance tracking web app for Bissam and his partner. Track expenses, income, budget targets, and compare periods — with shared read access between household members.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, Vite, Tailwind CSS, Recharts |
| Backend   | Node.js, Express                    |
| Database  | PostgreSQL                          |
| Auth      | Auth0 (Google login)                |
| Deploy    | Frontend → Vercel, Backend → Render / Railway |

---

## Project Structure

```
finance-tracker/
├── backend/
│   ├── src/
│   │   ├── index.js            # Express app entry point
│   │   ├── db.js               # PostgreSQL pool
│   │   ├── migrate.js          # Runs schema.sql against the DB
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT validation + user upsert
│   │   ├── routes/
│   │   │   ├── users.js        # /api/users/*
│   │   │   ├── expenses.js     # /api/expenses/*
│   │   │   ├── income.js       # /api/income/*
│   │   │   ├── budget.js       # /api/budget/*
│   │   │   ├── dashboard.js    # /api/dashboard/*
│   │   │   └── import.js       # /api/import/*
│   │   └── migrations/
│   │       └── schema.sql      # DB schema (idempotent)
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── api.js              # Axios client with Auth0 token injection
    │   ├── index.css           # Tailwind directives + component classes
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   ├── Navbar.jsx
    │   │   └── TransactionModal.jsx
    │   └── pages/
    │       ├── Dashboard.jsx
    │       ├── Expenses.jsx
    │       ├── Income.jsx
    │       ├── BudgetTargets.jsx
    │       ├── HistoricalComparison.jsx
    │       ├── Import.jsx
    │       └── HouseholdSetup.jsx
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── vercel.json
    ├── package.json
    └── .env.example
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally
- A database named `finance_tracker` (or any name you choose)

### 1. Clone / open the project

```bash
cd C:\Projects\finance-tracker
```

### 2. Set up the database

```bash
psql -U postgres -c "CREATE DATABASE finance_tracker;"
```

### 3. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/finance_tracker
AUTH0_DOMAIN=dev-yoag06mta5zqt28n.us.auth0.com
AUTH0_AUDIENCE=https://finance-tracker-api
FRONTEND_URL=http://localhost:5173
```

### 4. Run the database migration

```bash
cd backend
npm install
npm run migrate
```

### 5. Start the backend

```bash
npm run dev
# API running on http://localhost:4000
```

### 6. Configure the frontend

```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_AUTH0_DOMAIN=dev-yoag06mta5zqt28n.us.auth0.com
VITE_AUTH0_CLIENT_ID=bTX0bT7sTKi2heGFao4yvTNz0nbWp0Ju
VITE_AUTH0_AUDIENCE=https://finance-tracker-api
VITE_API_URL=http://localhost:4000
```

### 7. Start the frontend

```bash
npm install
npm run dev
# App running on http://localhost:5173
```

---

## Auth0 Configuration (required before first login)

### Create an API in Auth0

1. Go to **Auth0 Dashboard → Applications → APIs**
2. Create a new API:
   - Name: `Finance Tracker API`
   - Identifier: `https://finance-tracker-api`

### Configure the SPA application

1. Go to **Applications → bTX0bT7sTKi2heGFao4yvTNz0nbWp0Ju** (your client)
2. Set **Allowed Callback URLs**: `http://localhost:5173`
3. Set **Allowed Logout URLs**: `http://localhost:5173`
4. Set **Allowed Web Origins**: `http://localhost:5173`
5. Enable Google as a social connection under **Authentication → Social**

### Add custom claims (optional but recommended)

To pass `email` and `name` in the access token, create an **Action** (Login / Post-Login):

```javascript
exports.onExecutePostLogin = async (event, api) => {
  api.accessToken.setCustomClaim('https://finance-tracker/email', event.user.email);
  api.accessToken.setCustomClaim('https://finance-tracker/name', event.user.name);
};
```

---

## First-Time Use

1. Sign in with Google.
2. You'll be redirected to the **Household Setup** page.
3. **Bissam**: click **Create Household** — copy the Household ID shown in the network response or the DB.
4. **Partner**: click **Join Household** and paste the Household ID.
5. Both users are now in the same household and can see each other's data.

---

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build        # produces dist/
```

1. Push the `frontend/` folder to a GitHub repo.
2. Import it on [vercel.com](https://vercel.com).
3. Set these **Environment Variables** in the Vercel project settings:

   | Variable | Value |
   |----------|-------|
   | `VITE_AUTH0_DOMAIN` | `dev-yoag06mta5zqt28n.us.auth0.com` |
   | `VITE_AUTH0_CLIENT_ID` | `bTX0bT7sTKi2heGFao4yvTNz0nbWp0Ju` |
   | `VITE_AUTH0_AUDIENCE` | `https://finance-tracker-api` |
   | `VITE_API_URL` | `https://your-backend.onrender.com` |

4. After deploy, update Auth0 app settings to include the Vercel URL in callback/logout/origins.

### Backend → Render (recommended free tier)

1. Push the `backend/` folder to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Set Build Command: `npm install`
4. Set Start Command: `npm start`
5. Add environment variables:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | PostgreSQL connection string from Render's managed DB |
   | `AUTH0_DOMAIN` | `dev-yoag06mta5zqt28n.us.auth0.com` |
   | `AUTH0_AUDIENCE` | `https://finance-tracker-api` |
   | `FRONTEND_URL` | `https://your-app.vercel.app` |

6. Run migration once: in the Render shell, `node src/migrate.js`.

### Database → Render PostgreSQL

1. Create a **PostgreSQL** instance on Render (free tier available).
2. Copy the **Internal Database URL** into your backend service env as `DATABASE_URL`.

---

## Excel Import Format

| Sheet    | Column B | Column C | Column D     | Column E | Column F     | Column G |
|----------|----------|----------|--------------|----------|--------------|----------|
| Expenses | Date     | Vendor   | Amount       | Category | Hidden (Y/N) | Notes    |
| Income   | Date     | Source   | Amount       | Category | Hidden (Y/N) | Notes    |

**Notes:**
- Rows where column B is blank or equals `Expense Data`, `Income Data`, `Example:`, or `Date (MM-DD-YYYY)` are skipped.
- Amount can be a number or an Excel formula string like `=6686.74-2527.76` — it will be evaluated.
- Re-importing the same file is safe: rows are matched on `date + vendor/source + amount` and skipped if they already exist.

---

## Permissions Model

| Action | Own entries | Partner's entries |
|--------|-------------|-------------------|
| View | ✅ | ✅ (read-only) |
| Add | ✅ | ❌ |
| Edit | ✅ | ❌ |
| Delete | ✅ | ❌ |

Both users see the combined household view on all dashboard/summary pages.
