const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const db = require('../db');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Rows to skip (column B values that indicate header/meta rows)
const SKIP_VALUES = new Set([
  null, undefined, '', 'Expense Data', 'Income Data', 'Example:', 'Date (MM-DD-YYYY)'
]);

function parseAmount(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  // Handle Excel formula strings like "=6686.74-2527.76"
  if (str.startsWith('=')) {
    const expr = str.slice(1).replace(/[^0-9+\-*/().]/g, '');
    try {
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${expr})`)();
    } catch {
      return null;
    }
  }
  const parsed = parseFloat(str.replace(/[^0-9.\-]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

function parseDate(val) {
  if (val == null) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const str = String(val).trim();
  if (!str) return null;
  // Try MM-DD-YYYY or MM/DD/YYYY
  const m = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
  // Try YYYY-MM-DD
  const iso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return str;
  return null;
}

function parseSheet(sheet, type) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  const results = [];

  for (const row of rows) {
    const dateVal = row[1]; // Column B (0-indexed)
    if (SKIP_VALUES.has(dateVal) || (typeof dateVal === 'string' && SKIP_VALUES.has(dateVal.trim()))) continue;

    const date = parseDate(dateVal);
    if (!date) continue;

    const vendorOrSource = row[2] != null ? String(row[2]).trim() : null;
    const amount = parseAmount(row[3]);
    const category = row[4] != null ? String(row[4]).trim() : 'Other';
    const hidden = row[5] != null && String(row[5]).trim().toUpperCase() === 'Y';
    const notes = row[6] != null ? String(row[6]).trim() : null;

    if (!vendorOrSource || amount == null) continue;

    if (type === 'expense') {
      results.push({ date, vendor: vendorOrSource, amount, category, notes, hidden });
    } else {
      results.push({ date, source: vendorOrSource, amount, category, notes, hidden });
    }
  }

  return results;
}

// POST /api/import/preview — parse file, return rows for preview
router.post('/preview', upload.single('file'), async (req, res) => {
  if (!req.dbUser.household_id) {
    return res.status(403).json({ error: 'You must belong to a household first.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });

    const expSheet = workbook.Sheets['Expenses'] || workbook.Sheets['expenses'];
    const incSheet = workbook.Sheets['Income'] || workbook.Sheets['income'];

    const expenses = expSheet ? parseSheet(expSheet, 'expense') : [];
    const income   = incSheet ? parseSheet(incSheet, 'income') : [];

    res.json({ expenses, income, totalExpenses: expenses.length, totalIncome: income.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

// POST /api/import/confirm — import rows into DB
router.post('/confirm', upload.single('file'), async (req, res) => {
  if (!req.dbUser.household_id) {
    return res.status(403).json({ error: 'You must belong to a household first.' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { id: user_id, household_id } = req.dbUser;

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
    const expSheet = workbook.Sheets['Expenses'] || workbook.Sheets['expenses'];
    const incSheet = workbook.Sheets['Income'] || workbook.Sheets['income'];

    const expenses = expSheet ? parseSheet(expSheet, 'expense') : [];
    const income   = incSheet ? parseSheet(incSheet, 'income') : [];

    let importedExpenses = 0;
    let skippedExpenses  = 0;
    let importedIncome   = 0;
    let skippedIncome    = 0;

    // Import expenses with duplicate check on date+vendor+amount
    for (const row of expenses) {
      const exists = await db.query(
        `SELECT id FROM expenses WHERE household_id=$1 AND date=$2 AND vendor=$3 AND amount=$4 LIMIT 1`,
        [household_id, row.date, row.vendor, row.amount]
      );
      if (exists.rows.length > 0) { skippedExpenses++; continue; }

      await db.query(
        `INSERT INTO expenses (household_id, user_id, date, vendor, amount, category, notes, hidden)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [household_id, user_id, row.date, row.vendor, row.amount, row.category, row.notes, row.hidden]
      );
      importedExpenses++;
    }

    // Import income with duplicate check on date+source+amount
    for (const row of income) {
      const exists = await db.query(
        `SELECT id FROM income WHERE household_id=$1 AND date=$2 AND source=$3 AND amount=$4 LIMIT 1`,
        [household_id, row.date, row.source, row.amount]
      );
      if (exists.rows.length > 0) { skippedIncome++; continue; }

      await db.query(
        `INSERT INTO income (household_id, user_id, date, source, amount, category, notes, hidden)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [household_id, user_id, row.date, row.source, row.amount, row.category, row.notes, row.hidden]
      );
      importedIncome++;
    }

    res.json({ importedExpenses, skippedExpenses, importedIncome, skippedIncome });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

module.exports = router;
